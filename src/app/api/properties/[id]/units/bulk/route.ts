import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  units: z.array(
    z.object({
      unitNumber: z.string().min(1),
      floor: z.number().int().optional().nullable(),
      unitType: z.string().default("RESIDENTIAL"),
      buildingId: z.string().optional().nullable(),
    })
  ).min(1),
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
    const { units } = bulkSchema.parse(body);

    const result = await prisma.unit.createMany({
      data: units.map((u) => ({
        unitNumber: u.unitNumber,
        floor: u.floor ?? null,
        unitType: (u.unitType as "RESIDENTIAL") ?? "RESIDENTIAL",
        buildingId: u.buildingId ?? null,
        propertyId: id,
        organizationId: user.organizationId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ data: { created: result.count } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTY_UNITS_BULK]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
