import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  type: z.enum(["OIL_CHANGE","TIRE_ROTATION","TIRE_REPLACEMENT","BRAKE_SERVICE","FLUID_TOP_UP","BATTERY_REPLACEMENT","INSPECTION","REGISTRATION","INSURANCE","REPAIR","CLEANING","OTHER"]).optional(),
  description:        z.string().min(1).optional(),
  performedAt:        z.string().optional(),
  mileageAtService:   z.number().int().min(0).nullable().optional(),
  nextServiceMileage: z.number().int().min(0).nullable().optional(),
  nextServiceDate:    z.string().nullable().optional(),
  cost:               z.number().min(0).nullable().optional(),
  vendor:             z.string().nullable().optional(),
  notes:              z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, logId } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const updated = await prisma.vehicleMaintenance.update({
      where: { id: logId, vehicleId: id },
      data: {
        ...validated,
        performedAt: validated.performedAt ? new Date(validated.performedAt) : undefined,
        nextServiceDate: validated.nextServiceDate !== undefined
          ? (validated.nextServiceDate ? new Date(validated.nextServiceDate) : null)
          : undefined,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_MAINTENANCE_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, logId } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.vehicleMaintenance.delete({ where: { id: logId, vehicleId: id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VEHICLE_MAINTENANCE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
