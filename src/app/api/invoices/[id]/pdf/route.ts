import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: true,
        inspection: {
          include: {
            property: { select: { name: true, addressLine1: true, city: true, state: true, zip: true } },
          },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!invoice) return new NextResponse("Not found", { status: 404 });

    const org = user.organization;

    const element = React.createElement(InvoicePDF, {
      org: {
        name: org.name,
        addressLine1: org.addressLine1 ?? null,
        city: org.city ?? null,
        state: org.state ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        brandColor: (org as { brandColor?: string | null }).brandColor ?? null,
      },
      customer: {
        firstName: invoice.customer.firstName,
        lastName: invoice.customer.lastName,
        companyName: invoice.customer.companyName ?? null,
        email: invoice.customer.email ?? null,
        billingAddressLine1: invoice.customer.billingAddressLine1 ?? null,
        billingCity: invoice.customer.billingCity ?? null,
        billingState: invoice.customer.billingState ?? null,
        billingZip: invoice.customer.billingZip ?? null,
      },
      property: invoice.inspection?.property
        ? {
            name: invoice.inspection.property.name,
            addressLine1: invoice.inspection.property.addressLine1,
            city: invoice.inspection.property.city,
            state: invoice.inspection.property.state,
            zip: invoice.inspection.property.zip,
          }
        : null,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate ?? null,
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        taxAmount: Number(invoice.taxAmount),
        taxRate: Number(invoice.taxRate),
        taxCodeName: invoice.taxCodeName ?? null,
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        balanceDue: Number(invoice.balanceDue),
        notes: invoice.notes ?? null,
        inspectionNumber: invoice.inspection?.inspectionNumber ?? null,
      },
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
        referenceNumber: p.referenceNumber ?? null,
        processedAt: p.processedAt ?? null,
        createdAt: p.createdAt,
      })),
    });

    const pdfStream = await pdf(element as React.ReactElement<DocumentProps>).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[INVOICE_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
