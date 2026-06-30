import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  propertyId: z.string().min(1),
  barcode: z.string().min(1),
  stationType: z.enum(["TERMITE", "RODENT_BAIT", "RODENT_SNAP", "RODENT_GLUE", "RODENT_LIVE", "OTHER"]).default("OTHER"),
  label: z.string().optional(),
  locationNotes: z.string().optional(),
  installedAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const barcode = searchParams.get("barcode");

  if (barcode) {
    const station = await prisma.station.findUnique({
      where: { organizationId_barcode: { organizationId: user.organizationId, barcode } },
      include: {
        checks: { orderBy: { checkedAt: "desc" }, take: 5, include: { checkedBy: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!station) return NextResponse.json({ data: null });
    return NextResponse.json({ data: station });
  }

  if (!propertyId) return NextResponse.json({ error: "propertyId or barcode required" }, { status: 400 });

  const stations = await prisma.station.findMany({
    where: { propertyId, organizationId: user.organizationId },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 1 },
      _count: { select: { checks: true } },
    },
    orderBy: [{ stationType: "asc" }, { label: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: stations });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const body = await req.json();
    const validated = createSchema.parse(body);

    const property = await prisma.property.findFirst({
      where: { id: validated.propertyId, organizationId: user.organizationId },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const station = await prisma.station.create({
      data: {
        organizationId: user.organizationId,
        propertyId: validated.propertyId,
        barcode: validated.barcode,
        stationType: validated.stationType,
        label: validated.label,
        locationNotes: validated.locationNotes,
        installedAt: validated.installedAt ? new Date(validated.installedAt) : null,
      },
    });

    return NextResponse.json({ data: station }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "A station with this barcode already exists for your organization" }, { status: 409 });
    }
    console.error("[STATION_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
