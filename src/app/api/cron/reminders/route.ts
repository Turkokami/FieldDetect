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

  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledDate: { gte: tomorrowStart, lt: tomorrowEnd },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    include: {
      customer: { select: { firstName: true, email: true } },
      property: { select: { name: true, addressLine1: true, city: true } },
      technician: { select: { firstName: true, lastName: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const apt of appointments) {
    if (!apt.customer.email) { skipped++; continue; }

    const dateStr = apt.scheduledDate.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    const timeStr = apt.scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
    const techName = apt.technician
      ? `${apt.technician.firstName} ${apt.technician.lastName}`
      : null;

    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">Appointment Reminder ⏰</h2>
        <p style="color:#374151;margin:0 0 12px">Hi ${apt.customer.firstName},</p>
        <p style="color:#374151;margin:0 0 20px">
          This is a reminder for your K9 inspection <strong>tomorrow</strong>:
        </p>
        <div style="background:#f0fdf9;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-bottom:20px">
          <div style="margin-bottom:8px"><strong>📍 ${apt.property.name}</strong></div>
          <div style="color:#374151;font-size:14px">${apt.property.addressLine1}, ${apt.property.city}</div>
          <div style="color:#374151;font-size:14px;margin-top:6px">🗓 ${dateStr}</div>
          <div style="color:#374151;font-size:14px">⏱ ${timeStr}</div>
          ${techName ? `<div style="color:#374151;font-size:14px;margin-top:6px">👤 ${techName}</div>` : ""}
        </div>
        <p style="color:#374151;margin:0 0 16px;font-size:14px">
          Please ensure all areas are accessible and pets are secured during the inspection.
        </p>
        <a href="${APP_URL}/portal" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          View My Portal →
        </a>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · K9 Inspection Services · Automated reminder</p>
      </div>
    </div>`;

    try {
      if (resend) {
        await resend.emails.send({
          from: FROM,
          to: apt.customer.email,
          subject: `Reminder: K9 Inspection Tomorrow at ${apt.property.name}`,
          html,
        });
      } else {
        console.log(`[CRON_REMINDER] Would email ${apt.customer.email} for apt ${apt.id}`);
      }

      await prisma.notification.create({
        data: {
          customerId: apt.customerId,
          appointmentId: apt.id,
          type: "APPOINTMENT_REMINDER",
          channel: "EMAIL",
          subject: `Reminder: K9 Inspection Tomorrow at ${apt.property.name}`,
          body: html,
          recipientEmail: apt.customer.email,
          sentAt: new Date(),
        },
      });
      sent++;
    } catch (err) {
      console.error(`[CRON_REMINDER] Failed for apt ${apt.id}:`, err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, total: appointments.length });
}
