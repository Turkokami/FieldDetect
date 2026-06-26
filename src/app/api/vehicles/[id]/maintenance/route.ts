import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["OIL_CHANGE","TIRE_ROTATION","TIRE_REPLACEMENT","BRAKE_SERVICE","FLUID_TOP_UP","BATTERY_REPLACEMENT","INSPECTION","REGISTRATION","INSURANCE","REPAIR","CLEANING","OTHER"]).default("OTHER"),
  description:       z.string().min(1),
  performedAt:       z.string(),
  mileageAtService:  z.number().int().min(0).nullable().optional(),
  nextServiceMileage: z.number().int().min(0).nullable().optional(),
  nextServiceDate:   z.string().nullable().optional(),
  cost:              z.number().min(0).nullable().optional(),
  vendor:            z.string().nullable().optional(),
  notes:             z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const records = await prisma.vehicleMaintenance.findMany({
      where: { vehicleId: id },
      orderBy: { performedAt: "desc" },
    });

    return NextResponse.json({ data: records });
  } catch (error) {
    console.error("[VEHICLE_MAINTENANCE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = createSchema.parse(body);

    const record = await prisma.vehicleMaintenance.create({
      data: {
        vehicleId: id,
        ...validated,
        performedAt: new Date(validated.performedAt),
        nextServiceDate: validated.nextServiceDate ? new Date(validated.nextServiceDate) : null,
      },
    });

    // Update vehicle currentMileage if this service mileage is higher
    if (validated.mileageAtService && validated.mileageAtService > vehicle.currentMileage) {
      await prisma.vehicle.update({
        where: { id },
        data: { currentMileage: validated.mileageAtService },
      });
    }

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_MAINTENANCE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
