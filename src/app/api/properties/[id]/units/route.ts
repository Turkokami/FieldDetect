import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addUnitSchema = z.object({
  unitNumber: z.string().min(1),
  floor: z.union([z.number().int(), z.string()]).optional().nullable().transform((v) => v != null ? String(v) : null),
  unitType: z.enum([
    "APARTMENT", "HOTEL_ROOM", "DORM_ROOM", "OFFICE", "ROOM", "SUITE",
    "FLOOR", "AREA", "COMMON_AREA", "LOBBY", "HALLWAY", "STORAGE", "OTHER",
  ]).default("APARTMENT"),
  buildingId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

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
    const property = await prisma.property.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const body = await req.json();
    const validated = addUnitSchema.parse(body);

    const unit = await prisma.unit.create({
      data: {
        ...validated,
        propertyId: id,
      },
    });

    return NextResponse.json({ data: unit }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTY_UNITS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
