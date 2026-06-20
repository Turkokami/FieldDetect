import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(
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
        customer: true,
        lineItems: true,
        organization: true,
      },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customerEmail = invoice.customer.email;
    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer has no email address" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com";
    const invoiceUrl = invoice.stripePaymentUrl ?? `${appUrl}/portal`;

    const lineItemsHtml = invoice.lineItems
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.description}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.unitPrice).toFixed(2)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">$${Number(item.total).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111827">
        <div style="text-align:center;margin-bottom:32px">
          <h1 style="color:#1e40af;font-size:24px;margin:0">${invoice.organization.name}</h1>
        </div>
        <h2 style="font-size:20px;margin-bottom:4px">Invoice #${invoice.invoiceNumber}</h2>
        <p style="color:#6b7280;margin-top:0">
          Date: ${new Date(invoice.createdAt).toLocaleDateString()}<br>
          ${invoice.dueDate ? `Due: ${new Date(invoice.dueDate).toLocaleDateString()}` : ""}
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
          <strong>Bill To:</strong><br>
          ${invoice.customer.firstName} ${invoice.customer.lastName}
          ${invoice.customer.companyName ? `<br>${invoice.customer.companyName}` : ""}
          ${invoice.customer.email ? `<br>${invoice.customer.email}` : ""}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left">Description</th>
              <th style="padding:8px;text-align:center">Qty</th>
              <th style="padding:8px;text-align:right">Unit Price</th>
              <th style="padding:8px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>
        <div style="text-align:right;margin-bottom:24px">
          <div>Subtotal: <strong>$${Number(invoice.subtotal).toFixed(2)}</strong></div>
          ${Number(invoice.taxAmount) > 0 ? `<div>Tax: <strong>$${Number(invoice.taxAmount).toFixed(2)}</strong></div>` : ""}
          <div style="font-size:18px;margin-top:8px">
            Total Due: <strong style="color:#1e40af">$${Number(invoice.totalAmount).toFixed(2)}</strong>
          </div>
        </div>
        ${invoice.notes ? `<div style="color:#6b7280;margin-bottom:24px">${invoice.notes}</div>` : ""}
        <div style="text-align:center">
          <a href="${invoiceUrl}" style="background:linear-gradient(135deg,#0ABAB5,#0D9488);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
            View Invoice &amp; Pay Online →
          </a>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px">
          ${invoice.organization.name} &bull; Thank you for your business
        </p>
      </body>
      </html>
    `;

    if (resend) {
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@fielddetect.com";
      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject: `Invoice #${invoice.invoiceNumber} from ${invoice.organization.name}`,
        html,
      });
    } else {
      console.log(`[INVOICE_SEND] Resend not configured. Would send to ${customerEmail}`);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[INVOICE_SEND]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
