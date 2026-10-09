import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { applyExpiry, clientIp, findByToken, toPublicEstimate } from "@/lib/public-estimate";

const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

// GET /api/public/estimates/[token]?preview=1
// What the customer may see. The first view of a SENT estimate marks it VIEWED
// (skipped for ?preview=1, which the dashboard uses).
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    if (!(await rateLimit(`est-get:${token}:${clientIp(req)}`, 120, 60))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: NO_INDEX });
    }

    const estimate = await findByToken(token);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_INDEX });

    await applyExpiry(estimate);
    const preview = req.nextUrl.searchParams.get("preview") === "1";

    if (!preview && estimate.status === "SENT") {
      const viewedAt = new Date();
      const { count } = await prisma.estimate.updateMany({
        where: { id: estimate.id, status: "SENT" },
        data: { status: "VIEWED", viewedAt },
      });
      if (count) {
        estimate.status = "VIEWED";
        estimate.viewedAt = viewedAt;
      }
    }

    return NextResponse.json({ data: toPublicEstimate(estimate) }, { headers: NO_INDEX });
  } catch (err) {
    console.error("[PUBLIC_ESTIMATE_GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_INDEX });
  }
}
