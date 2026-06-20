import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "ACH", "STRIPE", "SQUARE", "OTHER"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  processedAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId");

    const payments = await prisma.payment.findMany({
      where: {
        invoice: { organizationId: user.organizationId },
        ...(invoiceId && { invoiceId }),
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error("[PAYMENTS_GET]", error);
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
    const validated = createPaymentSchema.parse(body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: validated.invoiceId, organizationId: user.organizationId },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: validated.invoiceId,
          amount: validated.amount,
          method: validated.method,
          referenceNumber: validated.referenceNumber,
          notes: validated.notes,
          status: "COMPLETED",
          processedAt: validated.processedAt ? new Date(validated.processedAt) : new Date(),
        },
      });

      const newPaid = Number(invoice.paidAmount) + validated.amount;
      const newBalance = Number(invoice.totalAmount) - newPaid;
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

      const updatedInvoice = await tx.invoice.update({
        where: { id: validated.invoiceId },
        data: {
          paidAmount: newPaid,
          balanceDue: Math.max(0, newBalance),
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : undefined,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PAYMENTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
