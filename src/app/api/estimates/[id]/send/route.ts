import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "quotes@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission("invoices:write");
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: { id, organizationId: ctx.organization.id },
      include: {
        customer: true,
        property: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!estimate.customer.email) {
      return NextResponse.json({ error: "Customer has no email address" }, { status: 400 });
    }

    const lineHtml = estimate.lineItems.map((li) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${li.description}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${li.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCurrency(li.unitPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCurrency(li.total)}</td>
      </tr>`).join("");

    const validStr = estimate.validUntil
      ? new Date(estimate.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:0;color:#1e293b">
  <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 28px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:20px;font-weight:800">🐾 ${ctx.organization.name}</span>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none">
    <h2 style="margin:0 0 4px;font-size:20px;color:#111827">Estimate #${estimate.estimateNumber}</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px">
      ${estimate.title ? `${estimate.title} · ` : ""}${estimate.property?.name ?? ""}
      ${validStr ? `<br>Valid through ${validStr}` : ""}
    </p>
    <p style="color:#374151;margin:0 0 20px">
      Hi ${estimate.customer.firstName},<br><br>
      Please find your estimate for inspection services below. You can accept or request changes directly from your portal.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:8px 10px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase">Description</th>
          <th style="padding:8px 10px;text-align:center;color:#64748b;font-size:11px;text-transform:uppercase">Qty</th>
          <th style="padding:8px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">Unit Price</th>
          <th style="padding:8px 10px;text-align:right;color:#64748b;font-size:11px;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>${lineHtml}</tbody>
    </table>
    <div style="text-align:right;margin-bottom:24px;font-size:13px">
      <div style="color:#64748b">Subtotal: ${formatCurrency(estimate.subtotal)}</div>
      ${estimate.taxAmount > 0 ? `<div style="color:#64748b">Tax: ${formatCurrency(estimate.taxAmount)}</div>` : ""}
      ${estimate.discountAmount > 0 ? `<div style="color:#64748b">Discount: -${formatCurrency(estimate.discountAmount)}</div>` : ""}
      <div style="font-size:18px;font-weight:800;color:#0ABAB5;margin-top:8px">Total: ${formatCurrency(estimate.totalAmount)}</div>
    </div>
    ${estimate.scopeNotes ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;color:#374151"><strong>Scope of Work:</strong><br>${estimate.scopeNotes}</div>` : ""}
    <div style="text-align:center">
      <a href="${APP_URL}/portal" style="display:inline-block;background:#0ABAB5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        View &amp; Accept Estimate →
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:12px 28px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
    <p style="margin:0;font-size:11px;color:#9ca3af">${ctx.organization.name} · This estimate is valid until ${validStr ?? "further notice"}</p>
  </div>
</body></html>`;

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: estimate.customer.email,
        subject: `Estimate #${estimate.estimateNumber} from ${ctx.organization.name}`,
        html,
      });
    } else {
      console.log(`[ESTIMATE_SEND] Would email ${estimate.customer.email}`);
    }

    const updated = await prisma.estimate.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return rbacResponse(err) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
