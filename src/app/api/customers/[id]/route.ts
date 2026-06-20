import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCustomerSchema = z.object({
  customerType: z.enum([
    "RESIDENTIAL", "COMMERCIAL", "PROPERTY_MANAGEMENT",
    "HOTEL", "DORMITORY", "ASSISTED_LIVING", "GOVERNMENT", "OTHER",
  ]).optional(),
  companyName: z.string().optional().nullable(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  altPhone: z.string().optional().nullable(),
  billingAddressLine1: z.string().optional().nullable(),
  billingAddressLine2: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingState: z.string().optional().nullable(),
  billingZip: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  referralSource: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function getAuthorizedUser(userId: string, customerId: string) {
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: user.organizationId },
  });
  if (!customer) return null;

  return { user, customer };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        contacts: true,
        properties: {
          include: { buildings: true, _count: { select: { units: true } } },
        },
        appointments: {
          orderBy: { scheduledDate: "desc" },
          take: 10,
          include: { technician: true, k9Team: true },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { appointments: true, invoices: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: customer });
  } catch (error) {
    console.error("[CUSTOMER_GET]", error);
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

    const { id } = await params;
    const ctx = await getAuthorizedUser(userId, id);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateCustomerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: validated,
      include: { contacts: true, properties: true },
    });

    return NextResponse.json({ data: customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[CUSTOMER_PATCH]", error);
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
    const ctx = await getAuthorizedUser(userId, id);
    if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[CUSTOMER_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
