import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  computeEstimateTotals,
  generateEstimateNumber,
  generatePublicToken,
  lineItemTotal,
  withUniqueRetry,
} from "@/lib/estimates";

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
  facilityData: z.unknown().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
});

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

    const { subtotal, taxAmount, totalAmount } = computeEstimateTotals(
      validated.lineItems, validated.taxRate, validated.discountAmount
    );

    const estimate = await withUniqueRetry(() => prisma.estimate.create({
      data: {
        organizationId: ctx.organization.id,
        customerId: validated.customerId,
        propertyId: validated.propertyId ?? null,
        estimateNumber: generateEstimateNumber(),
        publicToken: generatePublicToken(),
        title: validated.title ?? null,
        serviceType: (validated.serviceType as never) ?? "BED_BUG_INSPECTION",
        scopeNotes: validated.scopeNotes ?? null,
        internalNotes: validated.internalNotes ?? null,
        facilityData: validated.facilityData === null ? Prisma.JsonNull : (validated.facilityData as Prisma.InputJsonValue) ?? undefined,
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
            total: lineItemTotal(item),
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { lineItems: true },
    }));

    return NextResponse.json({ data: estimate }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
