import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { alertOwners } from "@/lib/owner-alerts";
import { APP_URL, escapeHtml } from "@/lib/estimates";
import { formatCurrency } from "@/lib/utils";
import { clientIp, customerDisplayName, findByToken, openAlertsEnabled } from "@/lib/public-estimate";

const MAX_SECONDS = 1800;

const schema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  type: z.enum(["OPENED", "SECTION_VIEW"]),
  section: z.number().int().min(0).max(200).optional().nullable(),
  seconds: z.number().min(0).optional().nullable(),
});

// POST /api/public/estimates/[token]/events
// Accepts fetch() JSON and navigator.sendBeacon() bodies (text/plain or JSON).
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = clientIp(req);
    if (!(await rateLimit(`est-ev:${token}:${ip}`, 120, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = JSON.parse(await req.text());
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const data = schema.parse(body);

    const estimate = await findByToken(token);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    if (data.type === "OPENED") {
      const seenSession = await prisma.estimateEvent.findFirst({
        where: { estimateId: estimate.id, type: "OPENED", sessionId: data.sessionId },
        select: { id: true },
      });
      await prisma.estimateEvent.create({
        data: { estimateId: estimate.id, type: "OPENED", sessionId: data.sessionId, ip, userAgent },
      });

      // Alert once per new browser session, if the org wants open alerts.
      if (!seenSession && openAlertsEnabled(estimate.organization.settings)) {
        const name = customerDisplayName(estimate);
        const total = formatCurrency(estimate.totalAmount);
        await alertOwners(estimate.organizationId, {
          subject: `${name} just opened estimate ${estimate.estimateNumber} (${total})`,
          sms: `${name} just opened estimate ${estimate.estimateNumber} (${total})`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <p style="font-size:16px"><strong>${escapeHtml(name)}</strong> just opened estimate
            <strong>${escapeHtml(estimate.estimateNumber)}</strong> (${total}).</p>
            <a href="${APP_URL}/estimates/${estimate.id}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700">Open estimate →</a>
          </div>`,
        });
      }
    } else {
      if (data.section == null) {
        return NextResponse.json({ error: "section is required for SECTION_VIEW" }, { status: 400 });
      }
      await prisma.estimateEvent.create({
        data: {
          estimateId: estimate.id,
          type: "SECTION_VIEW",
          sessionId: data.sessionId,
          section: data.section,
          seconds: Math.min(MAX_SECONDS, Math.round(data.seconds ?? 0)),
          ip,
          userAgent,
        },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    console.error("[PUBLIC_ESTIMATE_EVENT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
