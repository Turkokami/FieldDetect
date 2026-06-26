import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name:           z.string().min(1).optional(),
  type:           z.enum(["TRUCK","CAR","VAN","SUV","MOTORHOME","TRAILER","OTHER"]).optional(),
  status:         z.enum(["ACTIVE","IN_MAINTENANCE","INACTIVE"]).optional(),
  make:           z.string().nullable().optional(),
  model:          z.string().nullable().optional(),
  year:           z.number().int().min(1900).max(2100).nullable().optional(),
  color:          z.string().nullable().optional(),
  licensePlate:   z.string().nullable().optional(),
  vin:            z.string().nullable().optional(),
  currentMileage: z.number().int().min(0).optional(),
  notes:          z.string().nullable().optional(),
  isActive:       z.boolean().optional(),
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
      include: {
        maintenance: { orderBy: { performedAt: "desc" } },
        mileageLogs: {
          orderBy: { date: "desc" },
          take: 50,
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
        },
        appointments: {
          orderBy: { scheduledDate: "desc" },
          take: 20,
          include: {
            customer: { select: { firstName: true, lastName: true, companyName: true } },
            property: { select: { name: true, city: true, state: true } },
            technician: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { appointments: true, mileageLogs: true } },
      },
    });

    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: vehicle });
  } catch (error) {
    console.error("[VEHICLE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const result = await prisma.vehicle.updateMany({
      where: { id, organizationId: user.organizationId },
      data: validated,
    });

    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.vehicle.findUnique({ where: { id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLE_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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

    await prisma.vehicle.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VEHICLE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
