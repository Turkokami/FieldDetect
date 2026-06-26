import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  date:          z.string(),
  startMileage:  z.number().int().min(0),
  endMileage:    z.number().int().min(0),
  purpose:       z.string().nullable().optional(),
  destination:   z.string().nullable().optional(),
  appointmentId: z.string().nullable().optional(),
  notes:         z.string().nullable().optional(),
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

    const logs = await prisma.vehicleMileageLog.findMany({
      where: { vehicleId: id },
      orderBy: { date: "desc" },
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

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("[VEHICLE_MILEAGE_GET]", error);
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

    const { id } = await params;

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = createSchema.parse(body);

    if (validated.endMileage < validated.startMileage) {
      return NextResponse.json({ error: "End mileage must be >= start mileage" }, { status: 400 });
    }

    const log = await prisma.vehicleMileageLog.create({
      data: {
        vehicleId: id,
        userId: user.id,
        date: new Date(validated.date),
        startMileage: validated.startMileage,
        endMileage: validated.endMileage,
        purpose: validated.purpose ?? null,
        destination: validated.destination ?? null,
        appointmentId: validated.appointmentId ?? null,
        notes: validated.notes ?? null,
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

    // Auto-update vehicle current mileage if this trip's end mileage is higher
    if (validated.endMileage > vehicle.currentMileage) {
      await prisma.vehicle.update({
        where: { id },
        data: { currentMileage: validated.endMileage },
      });
    }

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_MILEAGE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
