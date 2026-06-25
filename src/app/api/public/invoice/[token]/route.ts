import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { paymentToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { where: { status: "COMPLETED" }, orderBy: { processedAt: "desc" } },
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      organization: { select: { name: true, phone: true, email: true, logoUrl: true, addressLine1: true, city: true, state: true } },
    },
  });

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  // Mark as viewed if not already
  if (!invoice.viewedAt) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { viewedAt: new Date(), status: invoice.status === "SENT" ? "VIEWED" : invoice.status } });
  }

  return NextResponse.json({
    data: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      discountAmount: Number(invoice.discountAmount),
      totalAmount: Number(invoice.totalAmount),
      balanceDue: Number(invoice.balanceDue),
      notes: invoice.notes,
      lineItems: invoice.lineItems.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        total: Number(li.total),
      })),
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        processedAt: p.processedAt,
      })),
      customer: invoice.customer,
      organization: invoice.organization,
    },
  });
}
