import { Resend } from "resend";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

type NotificationTrigger =
  | "CONFIRMED"
  | "EN_ROUTE"
  | "INSPECTION_COMPLETE"
  | "REPORT_SENT"
  | "INVOICED"
  | "CANCELLED";

const TRIGGERS = new Set<string>([
  "CONFIRMED", "EN_ROUTE", "INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "CANCELLED",
]);

// Which triggers also get an SMS
const SMS_TRIGGERS = new Set<NotificationTrigger>(["EN_ROUTE", "INSPECTION_COMPLETE"]);

const NOTIFICATION_TYPE_MAP: Record<NotificationTrigger, NotificationType> = {
  CONFIRMED:           NotificationType.APPOINTMENT_CONFIRMATION,
  EN_ROUTE:            NotificationType.TECHNICIAN_EN_ROUTE,
  INSPECTION_COMPLETE: NotificationType.INSPECTION_COMPLETE,
  REPORT_SENT:         NotificationType.REPORT_READY,
  INVOICED:            NotificationType.INVOICE_SENT,
  CANCELLED:           NotificationType.APPOINTMENT_CANCELLED,
};

type TemplateCtx = {
  firstName: string;
  propertyName: string;
  address: string;
  dateStr: string;
  timeStr: string;
  techName: string | null;
  portalUrl: string;
  paymentUrl?: string;
};

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;color:#1a1a1a">
    <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">🐾 FieldDetect</span>
    </div>
    <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
      <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">${title}</h2>
      ${body}
    </div>
    <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
      <p style="margin:0;font-size:11px;color:#9ca3af">
        FieldDetect · K9 Inspection Services · Automated notification · Do not reply
      </p>
    </div>
  </div>`;
}

function buildTemplate(
  status: NotificationTrigger,
  ctx: TemplateCtx
): { subject: string; html: string; sms: string } {
  const { firstName, propertyName, address, dateStr, timeStr, techName, portalUrl, paymentUrl } = ctx;
  const btn = (label: string, url: string) =>
    `<a href="${url}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:16px">${label}</a>`;

  switch (status) {
    case "CONFIRMED":
      return {
        subject: `Appointment Confirmed – ${dateStr}`,
        html: wrap("Your inspection is confirmed ✅", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0 0 16px">
            Your K9 bed bug inspection at <strong>${propertyName}</strong> (${address}) is confirmed for
            <strong>${dateStr} at ${timeStr}</strong>.
          </p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin-bottom:16px">
            <div style="font-size:12px;color:#166534;font-weight:600">📍 What to expect</div>
            <ul style="margin:8px 0 0;padding-left:18px;color:#374151;font-size:13px">
              <li>Our certified K9 team will arrive at your property</li>
              <li>Please ensure all areas are accessible</li>
              <li>Pets should be secured during the inspection</li>
            </ul>
          </div>
          <p style="color:#374151;margin:0">We'll send you a heads-up when your technician is on the way.</p>`),
        sms: `FieldDetect: Your K9 inspection at ${propertyName} is confirmed for ${dateStr} at ${timeStr}. Questions? Reply to this message.`,
      };

    case "EN_ROUTE":
      return {
        subject: "Your technician is on the way 🚗",
        html: wrap("Your technician is en route", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0 0 16px">
            ${techName ? `<strong>${techName}</strong> is` : "Your technician is"} on the way to
            <strong>${propertyName}</strong>. Please ensure access is available.
          </p>
          <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px">
            <div style="font-size:13px;color:#854d0e">⏱ Please have the property ready for inspection within the next 20–30 minutes.</div>
          </div>`),
        sms: `FieldDetect: ${techName ?? "Your technician"} is on the way to ${propertyName}. Please ensure access is ready.`,
      };

    case "INSPECTION_COMPLETE":
      return {
        subject: "Inspection Complete – Report Coming Soon",
        html: wrap("Inspection complete 🎉", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0 0 16px">
            The K9 inspection at <strong>${propertyName}</strong> has been completed. Your detailed report will be available shortly.
          </p>
          ${btn("View Your Portal", `${portalUrl}/reports`)}`),
        sms: `FieldDetect: Your K9 inspection at ${propertyName} is complete. Your report will be ready shortly. View at: ${portalUrl}/reports`,
      };

    case "REPORT_SENT":
      return {
        subject: "Your Inspection Report is Ready 📋",
        html: wrap("Your inspection report is ready", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0 0 16px">
            Your inspection report for <strong>${propertyName}</strong> is now available in your portal.
          </p>
          ${btn("View Report →", `${portalUrl}/reports`)}`),
        sms: `FieldDetect: Your inspection report for ${propertyName} is ready. View it at: ${portalUrl}/reports`,
      };

    case "INVOICED":
      return {
        subject: `Invoice Ready – ${propertyName}`,
        html: wrap("Your invoice is ready 🧾", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0 0 16px">
            Your invoice for the inspection at <strong>${propertyName}</strong> is ready. Pay securely online.
          </p>
          ${paymentUrl
            ? btn("Pay Now →", paymentUrl)
            : btn("View &amp; Pay Invoice →", `${portalUrl}/invoices`)}`),
        sms: `FieldDetect: Invoice ready for ${propertyName}. Pay at: ${paymentUrl ?? `${portalUrl}/invoices`}`,
      };

    case "CANCELLED":
      return {
        subject: `Appointment Cancelled – ${dateStr}`,
        html: wrap("Appointment cancelled", `
          <p style="color:#374151;margin:0 0 12px">Hi ${firstName},</p>
          <p style="color:#374151;margin:0">
            Your inspection at <strong>${propertyName}</strong> scheduled for
            <strong>${dateStr} at ${timeStr}</strong> has been cancelled. Please contact us to reschedule.
          </p>`),
        sms: `FieldDetect: Your inspection at ${propertyName} on ${dateStr} has been cancelled. Contact us to reschedule.`,
      };
  }
}

export async function notifyOnStatusChange(
  appointmentId: string,
  newStatus: string,
  options?: { paymentUrl?: string }
): Promise<void> {
  if (!TRIGGERS.has(newStatus)) return;

  try {
    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        customer: true,
        property: { select: { name: true, addressLine1: true, city: true, state: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    });

    if (!apt || !apt.customer.email) return;

    const dateStr = apt.scheduledDate.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
    const timeStr = apt.scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    const ctx: TemplateCtx = {
      firstName: apt.customer.firstName,
      propertyName: apt.property.name,
      address: `${apt.property.addressLine1}, ${apt.property.city}`,
      dateStr,
      timeStr,
      techName: apt.technician
        ? `${apt.technician.firstName} ${apt.technician.lastName}`
        : null,
      portalUrl: `${APP_URL}/portal`,
      paymentUrl: options?.paymentUrl,
    };

    const trigger = newStatus as NotificationTrigger;
    const { subject, html, sms: smsBody } = buildTemplate(trigger, ctx);
    const notifType = NOTIFICATION_TYPE_MAP[trigger];

    // Email
    if (resend) {
      await resend.emails.send({ from: FROM, to: apt.customer.email, subject, html });
    } else {
      console.log(`[NOTIFY] Email → ${apt.customer.email}: ${subject}`);
    }

    await prisma.notification.create({
      data: {
        customerId: apt.customerId,
        type: notifType,
        channel: "EMAIL",
        subject,
        body: html,
        appointmentId,
        recipientEmail: apt.customer.email,
        sentAt: new Date(),
      },
    });

    // SMS (for EN_ROUTE + INSPECTION_COMPLETE if phone available)
    if (SMS_TRIGGERS.has(trigger) && apt.customer.phone) {
      const sent = await sendSms(apt.customer.phone, smsBody);
      if (sent) {
        await prisma.notification.create({
          data: {
            customerId: apt.customerId,
            type: notifType,
            channel: "SMS",
            body: smsBody,
            appointmentId,
            recipientPhone: apt.customer.phone,
            sentAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error("[NOTIFY]", err);
  }
}

// Send an invoice-specific notification with payment URL
export async function notifyInvoiceSent(
  appointmentId: string,
  paymentUrl?: string
): Promise<void> {
  return notifyOnStatusChange(appointmentId, "INVOICED", { paymentUrl });
}
