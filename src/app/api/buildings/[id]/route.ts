import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1),
});

async function resolveBuilding(buildingId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;
  const building = await prisma.building.findFirst({
    where: {
      id: buildingId,
      property: { organizationId: user.organizationId },
    },
    include: { property: { select: { id: true } } },
  });
  return building;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const building = await resolveBuilding(id, userId);
    if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name } = patchSchema.parse(body);

    const updated = await prisma.building.update({ where: { id }, data: { name } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[BUILDINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const building = await resolveBuilding(id, userId);
    if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Move units to standalone (buildingId = null) before deleting building
    await prisma.unit.updateMany({
      where: { buildingId: id },
      data: { buildingId: null },
    });

    await prisma.building.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error("[BUILDINGS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
