import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const markerSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().optional(),
  count: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  addedAt: z.string(),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  markers: z.array(markerSchema).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const map = await prisma.propertyMap.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!map) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ data: map });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.propertyMap.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = patchSchema.parse(body);

    const updateData: Prisma.PropertyMapUpdateInput = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.markers !== undefined) updateData.markers = validated.markers as Prisma.InputJsonValue;

    const map = await prisma.propertyMap.update({ where: { id }, data: updateData });
    return NextResponse.json({ data: map });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTY_MAP_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const existing = await prisma.propertyMap.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.propertyMap.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
