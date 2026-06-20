import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "CONVERTED"]).optional(),
  title: z.string().optional().nullable(),
  scopeNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  taxRate: z.coerce.number().optional(),
  discountAmount: z.coerce.number().optional(),
  validUntil: z.string().datetime().optional().nullable(),
  declineReason: z.string().optional().nullable(),
  lineItems: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    sortOrder: z.number().int().default(0),
  })).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:read");
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: {
        customer: { include: { contacts: true } },
        property: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: estimate });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;

    const existing = await prisma.estimate.findFirst({
      where: { id, organizationId: ctx.organization.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.scopeNotes !== undefined) updateData.scopeNotes = validated.scopeNotes;
    if (validated.internalNotes !== undefined) updateData.internalNotes = validated.internalNotes;
    if (validated.validUntil !== undefined) updateData.validUntil = validated.validUntil ? new Date(validated.validUntil) : null;
    if (validated.declineReason !== undefined) updateData.declineReason = validated.declineReason;
    if (validated.status) {
      updateData.status = validated.status;
      if (validated.status === "SENT") updateData.sentAt = new Date();
      if (validated.status === "VIEWED") updateData.viewedAt = new Date();
      if (validated.status === "ACCEPTED") updateData.acceptedAt = new Date();
      if (validated.status === "DECLINED") updateData.declinedAt = new Date();
    }

    // Recalculate totals if line items change
    if (validated.lineItems) {
      const taxRate = validated.taxRate ?? existing.taxRate;
      const discountAmount = validated.discountAmount ?? existing.discountAmount;
      const subtotal = validated.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const taxAmount = (subtotal * taxRate) / 100;
      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.discountAmount = discountAmount;
      updateData.totalAmount = subtotal + taxAmount - discountAmount;
    }

    const estimate = await prisma.$transaction(async (tx) => {
      if (validated.lineItems) {
        await tx.estimateLineItem.deleteMany({ where: { estimateId: id } });
        await tx.estimateLineItem.createMany({
          data: validated.lineItems.map((item, idx) => ({
            estimateId: id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            sortOrder: item.sortOrder ?? idx,
          })),
        });
      }
      return tx.estimate.update({
        where: { id },
        data: updateData,
        include: { lineItems: { orderBy: { sortOrder: "asc" } }, customer: true, property: true },
      });
    });

    return NextResponse.json({ data: estimate });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:delete");
    const { id } = await params;

    const existing = await prisma.estimate.findFirst({
      where: { id, organizationId: ctx.organization.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.estimate.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
