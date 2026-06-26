import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name:          z.string().min(1),
  type:          z.enum(["TRUCK","CAR","VAN","SUV","MOTORHOME","TRAILER","OTHER"]).default("TRUCK"),
  make:          z.string().nullable().optional(),
  model:         z.string().nullable().optional(),
  year:          z.number().int().min(1900).max(2100).nullable().optional(),
  color:         z.string().nullable().optional(),
  licensePlate:  z.string().nullable().optional(),
  vin:           z.string().nullable().optional(),
  currentMileage: z.number().int().min(0).default(0),
  notes:         z.string().nullable().optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const vehicles = await prisma.vehicle.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        _count: { select: { appointments: true, mileageLogs: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ data: vehicles });
  } catch (error) {
    console.error("[VEHICLES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createSchema.parse(body);

    const vehicle = await prisma.vehicle.create({
      data: { organizationId: user.organizationId, ...validated },
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[VEHICLES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
