import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
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
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { include: { contacts: true } },
        inspection: {
          include: {
            property: true,
            appointment: { select: { id: true } },
          },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        organization: true,
      },
    });

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error("[INVOICE_GET]", error);
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
    const existing = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const validated = updateInvoiceSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.dueDate !== undefined) updateData.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
    if (validated.status === "SENT") updateData.sentAt = new Date();
    if (validated.status === "PAID") updateData.paidAt = new Date();

    // Recalculate totals if tax rate or discount changed
    if (validated.taxRate !== undefined || validated.discountAmount !== undefined) {
      const current = existing;
      const items = await prisma.invoiceLineItem.findMany({ where: { invoiceId: id } });
      const subtotal = items.reduce((s, i) => s + Number(i.total), 0);
      const discount = validated.discountAmount !== undefined ? validated.discountAmount : Number(current.discountAmount ?? 0);
      const taxRate = validated.taxRate !== undefined ? validated.taxRate : Number(current.taxRate ?? 0);
      const taxAmount = (subtotal - discount) * (taxRate / 100);
      const totalAmount = subtotal + taxAmount - discount;
      const amountPaid = Number(current.paidAmount ?? 0);
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;
      updateData.balanceDue = totalAmount - amountPaid;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, payments: true, customer: true },
    });

    return NextResponse.json({ data: invoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[INVOICE_PATCH]", error);
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
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { payments: true } } },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (invoice._count.payments > 0) {
      return NextResponse.json(
        { error: "Cannot delete an invoice that has recorded payments" },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INVOICE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
