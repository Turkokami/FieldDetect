import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  propertyType: z.enum([
    "SINGLE_FAMILY", "MULTI_FAMILY", "APARTMENT_COMPLEX", "CONDOMINIUM",
    "HOTEL", "MOTEL", "DORMITORY", "ASSISTED_LIVING", "NURSING_HOME",
    "OFFICE", "WAREHOUSE", "RETAIL", "RESTAURANT", "SCHOOL",
    "HOSPITAL", "GOVERNMENT", "OTHER",
  ]).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  zip: z.string().min(1).optional(),
  totalUnits: z.number().int().positive().optional().nullable(),
  totalBuildings: z.number().int().positive().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  gateCode: z.string().optional().nullable(),
  parkingNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
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
      include: {
        customer: { include: { contacts: true } },
        buildings: {
          include: {
            units: { orderBy: [{ floor: "asc" }, { unitNumber: "asc" }] },
          },
          orderBy: { name: "asc" },
        },
        units: {
          where: { buildingId: null },
          orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
        },
        appointments: {
          include: {
            technician: { select: { id: true, firstName: true, lastName: true } },
            inspection: { select: { id: true, inspectionNumber: true, overallResult: true } },
          },
          orderBy: { scheduledDate: "desc" },
          take: 10,
        },
        _count: { select: { units: true, appointments: true, inspections: true } },
      },
    });

    if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: property });
  } catch (error) {
    console.error("[PROPERTY_GET]", error);
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

    const { id } = await params;
    const existing = await prisma.property.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updatePropertySchema.parse(body);

    const property = await prisma.property.update({
      where: { id },
      data: validated,
      include: { customer: true, buildings: true },
    });

    return NextResponse.json({ data: property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTY_PATCH]", error);
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

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.property.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.property.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[PROPERTY_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
