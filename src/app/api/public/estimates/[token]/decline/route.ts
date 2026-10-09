import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { alertOwners } from "@/lib/owner-alerts";
import { APP_URL, escapeHtml } from "@/lib/estimates";
import { formatCurrency } from "@/lib/utils";
import { applyExpiry, clientIp, customerDisplayName, findByToken } from "@/lib/public-estimate";

const schema = z.object({ reason: z.string().trim().max(2000).optional().nullable() });

// POST /api/public/estimates/[token]/decline
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = clientIp(req);
    if (!(await rateLimit(`est-dec:${token}:${ip}`, 10, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { reason } = schema.parse(await req.json().catch(() => ({})));
    const estimate = await findByToken(token);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const status = await applyExpiry(estimate);
    if (status !== "SENT" && status !== "VIEWED") {
      return NextResponse.json({ error: "This estimate can no longer be declined online." }, { status: 409 });
    }

    const declinedAt = new Date();
    const { count } = await prisma.estimate.updateMany({
      where: { id: estimate.id, status: { in: ["SENT", "VIEWED"] } },
      data: { status: "DECLINED", declinedAt, declineReason: reason || null },
    });
    if (count === 0) {
      return NextResponse.json({ error: "This estimate can no longer be declined online." }, { status: 409 });
    }

    await prisma.estimateEvent.create({
      data: {
        estimateId: estimate.id,
        type: "DECLINED",
        ip,
        userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });

    const customer = customerDisplayName(estimate);
    await alertOwners(estimate.organizationId, {
      subject: `Declined — ${customer} declined ${estimate.estimateNumber} ${formatCurrency(estimate.totalAmount)}`,
      sms: `Declined: ${customer} declined ${estimate.estimateNumber}${reason ? ` — "${reason.slice(0, 100)}"` : ""}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="margin:0 0 12px">Estimate declined</h2>
        <p><strong>${escapeHtml(customer)}</strong> declined <strong>${escapeHtml(estimate.estimateNumber)}</strong> (${formatCurrency(estimate.totalAmount)}).</p>
        ${reason ? `<p style="background:#f8fafc;padding:12px;border-radius:8px">“${escapeHtml(reason)}”</p>` : "<p style=\"color:#6b7280\">No reason given.</p>"}
        <a href="${APP_URL}/estimates/${estimate.id}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open estimate →</a>
      </div>`,
    });

    return NextResponse.json({ data: { status: "DECLINED", declinedAt } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[PUBLIC_ESTIMATE_DECLINE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
