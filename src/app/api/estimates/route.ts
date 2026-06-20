import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  sortOrder: z.number().int().default(0),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  propertyId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  serviceType: z.string().optional(),
  scopeNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  validUntil: z.string().datetime().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
});

function generateEstimateNumber() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `EST-${yy}${mm}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:read");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    const estimates = await prisma.estimate.findMany({
      where: {
        organizationId: ctx.organization.id,
        ...(status ? { status: status as never } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: estimates });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("invoices:write");
    const body = await req.json();
    const validated = createSchema.parse(body);

    const subtotal = validated.lineItems.reduce(
      (s, i) => s + i.quantity * i.unitPrice, 0
    );
    const taxAmount = (subtotal * validated.taxRate) / 100;
    const totalAmount = subtotal + taxAmount - validated.discountAmount;

    const estimate = await prisma.estimate.create({
      data: {
        organizationId: ctx.organization.id,
        customerId: validated.customerId,
        propertyId: validated.propertyId ?? null,
        estimateNumber: generateEstimateNumber(),
        title: validated.title ?? null,
        serviceType: (validated.serviceType as never) ?? "BED_BUG_INSPECTION",
        scopeNotes: validated.scopeNotes ?? null,
        internalNotes: validated.internalNotes ?? null,
        taxRate: validated.taxRate,
        discountAmount: validated.discountAmount,
        taxAmount,
        subtotal,
        totalAmount,
        validUntil: validated.validUntil ? new Date(validated.validUntil) : null,
        lineItems: {
          create: validated.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json({ data: estimate }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
