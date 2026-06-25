import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
      include: { customer: true, lineItems: true, organization: true },
    });
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customerEmail = invoice.customer.email;
    if (!customerEmail) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fielddetect.com";
    const token = invoice.paymentToken ?? randomBytes(24).toString("hex");
    const paymentUrl = `${appUrl}/pay/${token}`;

    // persist token + payment URL before sending
    await prisma.invoice.update({
      where: { id },
      data: { paymentToken: token, stripePaymentUrl: paymentUrl, status: "SENT", sentAt: new Date() },
    });

    const org = invoice.organization;
    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const lineRows = invoice.lineItems.map((item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#1e293b">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b">${Number(item.quantity)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#64748b">${fmt(Number(item.unitPrice))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b">${fmt(Number(item.total))}</td>
      </tr>`).join("");

    const balanceDue = Number(invoice.balanceDue);
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:24px 28px">
    <div style="display:flex;align-items:center;gap:10px">
      ${org.logoUrl ? `<img src="${org.logoUrl}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover">` : `<span style="font-size:28px">🐾</span>`}
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">${org.name}</span>
    </div>
  </div>

  <!-- Invoice banner -->
  <div style="background:#0f172a;padding:20px 28px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Invoice</div>
      <div style="color:#fff;font-size:22px;font-weight:800;font-family:monospace">#${invoice.invoiceNumber}</div>
    </div>
    <div style="text-align:right">
      <div style="color:#94a3b8;font-size:11px">Issued ${new Date(invoice.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      ${invoice.dueDate ? `<div style="color:#fbbf24;font-size:11px;margin-top:2px">Due ${new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>` : ""}
    </div>
  </div>

  <!-- Body -->
  <div style="padding:28px">
    <p style="margin:0 0 20px;color:#374151;font-size:15px">
      Hi ${invoice.customer.firstName},<br><br>
      Please find your invoice from <strong>${org.name}</strong> below.
    </p>

    <!-- Line items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #e2e8f0">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #e2e8f0">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #e2e8f0">Rate</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #e2e8f0">Amount</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="border-top:2px solid #e2e8f0;padding-top:16px;text-align:right">
      ${Number(invoice.subtotal) !== Number(invoice.totalAmount) ? `<div style="font-size:14px;color:#64748b;margin-bottom:6px">Subtotal: ${fmt(Number(invoice.subtotal))}</div>` : ""}
      ${Number(invoice.taxAmount) > 0 ? `<div style="font-size:14px;color:#64748b;margin-bottom:6px">Tax: ${fmt(Number(invoice.taxAmount))}</div>` : ""}
      ${Number(invoice.discountAmount) > 0 ? `<div style="font-size:14px;color:#16a34a;margin-bottom:6px">Discount: -${fmt(Number(invoice.discountAmount))}</div>` : ""}
      <div style="font-size:20px;font-weight:800;color:#0f172a">Total Due: ${fmt(Number(invoice.totalAmount))}</div>
    </div>

    ${invoice.notes ? `<div style="margin-top:20px;padding:14px;background:#f8fafc;border-radius:8px;border-left:4px solid #0ABAB5;font-size:13px;color:#475569">${invoice.notes}</div>` : ""}
  </div>

  <!-- CTA -->
  <div style="background:#f0fdfa;border-top:1px solid #ccfbf1;padding:24px 28px;text-align:center">
    <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px">
      Amount due: <span style="color:#0ABAB5">${fmt(balanceDue)}</span>
    </div>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px">Click below to view your invoice and pay securely online.</p>
    <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ABAB5,#0D9488);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
      View Invoice &amp; Pay Online →
    </a>
  </div>

  <!-- Footer -->
  <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">
      ${org.name}${org.phone ? ` · ${org.phone}` : ""}${org.email ? ` · ${org.email}` : ""}
    </p>
  </div>
</div>
</body>
</html>`;

    if (resend) {
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "invoices@fielddetect.com";
      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject: `Invoice #${invoice.invoiceNumber} from ${org.name} — ${fmt(Number(invoice.totalAmount))} due`,
        html,
      });
    } else {
      console.log(`[INVOICE_SEND] Would email ${customerEmail}: Invoice #${invoice.invoiceNumber}, paymentUrl: ${paymentUrl}`);
    }

    const updated = await prisma.invoice.findUnique({ where: { id } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[INVOICE_SEND]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
