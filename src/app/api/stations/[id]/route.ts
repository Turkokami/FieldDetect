import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  stationType: z.enum(["TERMITE", "RODENT_BAIT", "RODENT_SNAP", "RODENT_GLUE", "RODENT_LIVE", "OTHER"]).optional(),
  label: z.string().optional().nullable(),
  locationNotes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  installedAt: z.string().datetime().optional().nullable(),
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
  const station = await prisma.station.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      property: { select: { name: true, addressLine1: true, city: true, state: true } },
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 20,
        include: { checkedBy: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { checks: true } },
    },
  });

  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: station });
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
  const existing = await prisma.station.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = patchSchema.parse(body);

    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(validated.stationType !== undefined ? { stationType: validated.stationType } : {}),
        ...(validated.label !== undefined ? { label: validated.label } : {}),
        ...(validated.locationNotes !== undefined ? { locationNotes: validated.locationNotes } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        ...(validated.installedAt !== undefined
          ? { installedAt: validated.installedAt ? new Date(validated.installedAt) : null }
          : {}),
      },
    });

    return NextResponse.json({ data: station });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[STATION_PATCH]", error);
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

  if (!["OWNER", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.station.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.station.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
