import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  date:          z.string().optional(),
  startMileage:  z.number().int().min(0).optional(),
  endMileage:    z.number().int().min(0).optional(),
  purpose:       z.string().nullable().optional(),
  destination:   z.string().nullable().optional(),
  appointmentId: z.string().nullable().optional(),
  notes:         z.string().nullable().optional(),
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

    const { id, logId } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const log = await prisma.vehicleMileageLog.findFirst({
      where: { id: logId, vehicleId: id },
    });
    // Allow the owner of the log or admins to edit
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (log.userId !== user.id && !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const updated = await prisma.vehicleMileageLog.update({
      where: { id: logId },
      data: {
        ...validated,
        date: validated.date ? new Date(validated.date) : undefined,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        appointment: {
          select: {
            id: true,
            scheduledDate: true,
            customer: { select: { firstName: true, lastName: true, companyName: true } },
            property: { select: { name: true, city: true, state: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_MILEAGE_PATCH]", error);
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

    const { id, logId } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const log = await prisma.vehicleMileageLog.findFirst({
      where: { id: logId, vehicleId: id },
    });
    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (log.userId !== user.id && !["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.vehicleMileageLog.delete({ where: { id: logId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VEHICLE_MILEAGE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
