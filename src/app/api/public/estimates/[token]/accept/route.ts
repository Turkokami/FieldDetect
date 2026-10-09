import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { alertOwners } from "@/lib/owner-alerts";
import { APP_URL, escapeHtml } from "@/lib/estimates";
import { formatCurrency } from "@/lib/utils";
import { applyExpiry, clientIp, customerDisplayName, findByToken } from "@/lib/public-estimate";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "quotes@fielddetect.com";
const MAX_SIGNATURE_CHARS = 200 * 1024;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional().nullable(),
  agree: z.literal(true),
  signatureDataUrl: z
    .string()
    .max(MAX_SIGNATURE_CHARS, "Signature image is too large")
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Signature must be a PNG data URL")
    .optional()
    .nullable(),
});

// POST /api/public/estimates/[token]/accept
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = clientIp(req);
    if (!(await rateLimit(`est-acc:${token}:${ip}`, 10, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const data = schema.parse(await req.json());
    const estimate = await findByToken(token);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const status = await applyExpiry(estimate);
    if (status === "ACCEPTED" || status === "CONVERTED") {
      return NextResponse.json({ error: "This estimate has already been accepted." }, { status: 409 });
    }
    if (status === "EXPIRED") {
      return NextResponse.json({ error: "This estimate has expired. Please contact us for an updated quote." }, { status: 410 });
    }
    if (status !== "SENT" && status !== "VIEWED") {
      return NextResponse.json({ error: "This estimate can't be accepted online." }, { status: 409 });
    }

    const acceptedAt = new Date();
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Conditional update so two simultaneous accepts can't both succeed.
    const { count } = await prisma.estimate.updateMany({
      where: { id: estimate.id, status: { in: ["SENT", "VIEWED"] } },
      data: {
        status: "ACCEPTED",
        acceptedAt,
        acceptedByName: data.name,
        acceptedByTitle: data.title || null,
        acceptedIp: ip,
        acceptedUserAgent: userAgent,
        signatureDataUrl: data.signatureDataUrl || null,
      },
    });
    if (count === 0) {
      return NextResponse.json({ error: "This estimate has already been accepted." }, { status: 409 });
    }

    await prisma.estimateEvent.create({
      data: { estimateId: estimate.id, type: "ACCEPTED", ip, userAgent },
    });

    const total = formatCurrency(estimate.totalAmount);
    const customer = customerDisplayName(estimate);
    await alertOwners(estimate.organizationId, {
      subject: `ACCEPTED — ${customer} accepted ${estimate.estimateNumber} ${total}`,
      sms: `ACCEPTED: ${customer} accepted ${estimate.estimateNumber} ${total}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a;margin:0 0 12px">Estimate accepted ✅</h2>
        <p><strong>${escapeHtml(customer)}</strong> accepted <strong>${escapeHtml(estimate.estimateNumber)}</strong> for <strong>${total}</strong>.</p>
        <p style="color:#6b7280">Signed by ${escapeHtml(data.name)}${data.title ? `, ${escapeHtml(data.title)}` : ""} · ${acceptedAt.toUTCString()}${ip ? ` · IP ${escapeHtml(ip)}` : ""}</p>
        <a href="${APP_URL}/estimates/${estimate.id}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open estimate →</a>
      </div>`,
    });

    // Confirmation to the customer, branded as the org (no FieldDetect branding).
    if (estimate.customer.email) {
      const org = estimate.organization;
      const color = org.brandColor ?? "#0ABAB5";
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:${color};padding:18px 24px;border-radius:10px 10px 0 0;color:#fff;font-size:18px;font-weight:800">${escapeHtml(org.name)}</div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 10px 10px">
          <p>Hi ${escapeHtml(estimate.customer.firstName)},</p>
          <p>Thank you! We've received your acceptance of estimate <strong>${escapeHtml(estimate.estimateNumber)}</strong>${estimate.title ? ` (${escapeHtml(estimate.title)})` : ""} for <strong>${total}</strong>.</p>
          <p>We'll be in touch shortly to schedule the work.</p>
          <p style="margin:20px 0"><a href="${APP_URL}/e/${token}" style="color:${color};font-weight:700">View your estimate</a></p>
          <p style="color:#6b7280;font-size:12px">Accepted by ${escapeHtml(data.name)} on ${acceptedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.${org.phone ? ` Questions? Call ${escapeHtml(org.phone)}.` : ""}</p>
        </div>
      </div>`;
      try {
        if (resend) {
          await resend.emails.send({
            from: FROM,
            to: estimate.customer.email,
            subject: `Estimate ${estimate.estimateNumber} accepted — ${org.name}`,
            html,
          });
        } else {
          console.log(`[ESTIMATE_ACCEPT] Would email confirmation to ${estimate.customer.email}`);
        }
      } catch (err) {
        console.error("[ESTIMATE_ACCEPT] confirmation email failed", err);
      }
    }

    return NextResponse.json({ data: { status: "ACCEPTED", acceptedAt, acceptedByName: data.name } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[PUBLIC_ESTIMATE_ACCEPT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
