import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import type { Organization } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { unitSuffix } from "@/lib/units";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "quotes@fielddetect.com";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

// ─── Totals ───────────────────────────────────────────────────────────────────

type TotalsInput = { quantity: number; unitPrice: number }[];

/** The single estimate totals formula: subtotal + tax% − discount. */
export function computeEstimateTotals(lineItems: TotalsInput, taxRate: number, discountAmount: number) {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount - discountAmount;
  return { subtotal, taxAmount, totalAmount };
}

export function lineItemTotal(item: { quantity: number; unitPrice: number }) {
  return item.quantity * item.unitPrice;
}

// ─── Numbers and tokens ───────────────────────────────────────────────────────

export function generateEstimateNumber() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `EST-${yy}${mm}-${rand}`;
}

/** Token for the customer's public link /e/<token>: 24 random bytes, base64url. */
export function generatePublicToken() {
  return randomBytes(24).toString("base64url");
}

export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Runs `create` (which should call generateEstimateNumber()) and retries up to
 * 3 times when it hits a unique-constraint error, e.g. a colliding number.
 */
export async function withUniqueRetry<T>(create: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await create();
    } catch (err) {
      if (i >= attempts || !isUniqueConstraintError(err)) throw err;
    }
  }
}

// ─── Sending ──────────────────────────────────────────────────────────────────

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Emails the estimate to the customer and marks it SENT. Shared by
 * POST /api/estimates/[id]/send and the integrations endpoint.
 * Throws Error("NoCustomerEmail") if the customer has no email.
 */
export async function sendEstimate(estimateId: string, organization: Pick<Organization, "id" | "name">) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId: organization.id },
    include: {
      customer: true,
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) throw new Error("NotFound");
  if (!estimate.customer.email) throw new Error("NoCustomerEmail");

  // The email links to the public estimate page, so make sure it has a token.
  const publicToken = estimate.publicToken ?? generatePublicToken();
  if (!estimate.publicToken) {
    await prisma.estimate.update({ where: { id: estimate.id }, data: { publicToken } });
  }
  const estimateUrl = `${APP_URL}/e/${publicToken}`;

  const orgName = escapeHtml(organization.name);
  const lineHtml = estimate.lineItems.map((li) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9">${escapeHtml(li.description)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center">${li.unit === "FLAT" ? "flat" : `${li.quantity}${unitSuffix(li.unit) ? ` ${unitSuffix(li.unit)}` : ""}`}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCurrency(li.unitPrice)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right">${formatCurrency(li.total)}</td>
      </tr>`).join("");

  const validStr = estimate.validUntil
    ? new Date(estimate.validUntil).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:0;color:#1e293b">
  <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 28px;border-radius:10px 10px 0 0">
    <span style="color:#fff;font-size:20px;font-weight:800">🐾 ${orgName}</span>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none">
    <h2 style="margin:0 0 4px;font-size:20px;color:#111827">Estimate #${estimate.estimateNumber}</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px">
      ${estimate.title ? `${escapeHtml(estimate.title)} · ` : ""}${escapeHtml(estimate.property?.name ?? "")}
      ${validStr ? `<br>Valid through ${validStr}` : ""}
    </p>
    <p style="color:#374151;margin:0 0 20px">
      Hi ${escapeHtml(estimate.customer.firstName)},<br><br>
      Please find your estimate below. You can review and accept it online.
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
    ${estimate.scopeNotes ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;color:#374151"><strong>Scope of Work:</strong><br>${escapeHtml(estimate.scopeNotes)}</div>` : ""}
    <div style="text-align:center">
      <a href="${estimateUrl}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        View &amp; Accept Estimate →
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:12px 28px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
    <p style="margin:0;font-size:11px;color:#9ca3af">${orgName} · This estimate is valid until ${validStr ?? "further notice"}</p>
  </div>
</body></html>`;

  if (resend) {
    await resend.emails.send({
      from: FROM,
      to: estimate.customer.email,
      subject: `Estimate #${estimate.estimateNumber} from ${organization.name}`,
      html,
    });
  } else {
    console.log(`[ESTIMATE_SEND] Would email ${estimate.customer.email}`);
  }

  return prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      // Re-sending never downgrades an estimate the customer viewed or accepted.
      ...(["VIEWED", "ACCEPTED", "CONVERTED"].includes(estimate.status) ? {} : { status: "SENT" as const }),
      sentAt: new Date(),
    },
  });
}
