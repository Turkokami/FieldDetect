import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPropertySchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  propertyType: z.enum([
    "SINGLE_FAMILY", "MULTI_FAMILY", "APARTMENT_COMPLEX", "CONDOMINIUM",
    "HOTEL", "MOTEL", "DORMITORY", "ASSISTED_LIVING", "NURSING_HOME",
    "OFFICE", "WAREHOUSE", "RETAIL", "RESTAURANT", "SCHOOL",
    "HOSPITAL", "GOVERNMENT", "OTHER",
  ]).default("SINGLE_FAMILY"),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  totalUnits: z.number().int().positive().optional(),
  totalBuildings: z.number().int().positive().optional(),
  accessNotes: z.string().optional(),
  gateCode: z.string().optional(),
  parkingNotes: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search") ?? "";
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    const where = {
      organizationId: user.organizationId,
      isActive: true,
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { addressLine1: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          buildings: { select: { id: true, name: true } },
          _count: { select: { units: true, appointments: true, inspections: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      data: properties,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[PROPERTIES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const validated = createPropertySchema.parse(body);

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({
      where: { id: validated.customerId, organizationId: user.organizationId },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const property = await prisma.property.create({
      data: { ...validated, organizationId: user.organizationId },
      include: { customer: true, buildings: true },
    });

    return NextResponse.json({ data: property }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PROPERTIES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
