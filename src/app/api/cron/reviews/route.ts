import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("authorization");
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find inspections completed 20-28 hours ago that haven't had a review request sent
  const cutoffStart = new Date(Date.now() - 28 * 60 * 60 * 1000);
  const cutoffEnd = new Date(Date.now() - 20 * 60 * 60 * 1000);

  const inspections = await prisma.inspection.findMany({
    where: {
      endTime: { gte: cutoffStart, lte: cutoffEnd },
      reviewRequestedAt: null,
      customerRating: null,
    },
    include: {
      appointment: {
        include: {
          customer: { select: { firstName: true, email: true } },
        },
      },
      property: { select: { name: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const ins of inspections) {
    const email = ins.appointment.customer.email;
    if (!email) { skipped++; continue; }

    const firstName = ins.appointment.customer.firstName;
    const reviewUrl = `${APP_URL}/review/${ins.id}`;

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">How did your inspection go? ⭐</h2>
        <p style="color:#374151;margin:0 0 16px">Hi ${firstName}, your K9 inspection at <strong>${ins.property.name}</strong> is complete. We'd love to hear how it went — it only takes 30 seconds!</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#0ABAB5,#0D9488);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
            Leave a Quick Review →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">Takes less than 30 seconds. Your feedback helps us improve.</p>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · K9 Inspection Services · Automated follow-up</p>
      </div>
    </div>`;

    try {
      if (resend) {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `How was your inspection at ${ins.property.name}?`,
          html,
        });
      } else {
        console.log(`[CRON_REVIEWS] Would email ${email} for inspection ${ins.id}`);
      }

      await prisma.inspection.update({
        where: { id: ins.id },
        data: { reviewRequestedAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`[CRON_REVIEWS] Failed for inspection ${ins.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, total: inspections.length });
}
