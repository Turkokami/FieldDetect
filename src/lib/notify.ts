import { Resend } from "resend";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
};

function wrap(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
    <div style="background:#0ABAB5;padding:16px 24px;border-radius:8px 8px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">FieldDetect</span>
    </div>
    <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
      <p style="margin:0;font-size:12px;color:#9ca3af">FieldDetect · Automated notification</p>
    </div>
  </div>`;
}

function buildTemplate(status: NotificationTrigger, ctx: TemplateCtx): { subject: string; html: string } {
  const { firstName, propertyName, address, dateStr, timeStr, techName, portalUrl } = ctx;

  switch (status) {
    case "CONFIRMED":
      return {
        subject: `Appointment Confirmed – ${dateStr}`,
        html: wrap(
          "Your inspection is confirmed",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0 0 12px;color:#374151">
             Your K9 inspection at <strong>${propertyName}</strong> (${address}) is confirmed for
             <strong>${dateStr} at ${timeStr}</strong>.
           </p>
           <p style="margin:0;color:#374151">We'll send you a heads-up when your technician is on the way.</p>`
        ),
      };

    case "EN_ROUTE":
      return {
        subject: "Your technician is on the way",
        html: wrap(
          "Your technician is en route",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0 0 12px;color:#374151">
             ${techName ? `<strong>${techName}</strong> is` : "Your technician is"} on the way to
             <strong>${propertyName}</strong>.
           </p>
           <p style="margin:0;color:#374151">Please ensure access is available upon arrival.</p>`
        ),
      };

    case "INSPECTION_COMPLETE":
      return {
        subject: "Inspection Complete – Report Coming Soon",
        html: wrap(
          "Inspection complete",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0 0 12px;color:#374151">
             The K9 inspection at <strong>${propertyName}</strong> has been completed.
           </p>
           <p style="margin:0;color:#374151">Your detailed report will be sent to you shortly.</p>`
        ),
      };

    case "REPORT_SENT":
      return {
        subject: "Your Inspection Report is Ready",
        html: wrap(
          "Your inspection report is ready",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0 0 16px;color:#374151">
             Your inspection report for <strong>${propertyName}</strong> is now available.
           </p>
           <a href="${portalUrl}/reports"
             style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
             View Report
           </a>`
        ),
      };

    case "INVOICED":
      return {
        subject: `Invoice Ready – ${propertyName}`,
        html: wrap(
          "Your invoice is ready",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0 0 16px;color:#374151">
             Your invoice for the inspection at <strong>${propertyName}</strong> is ready.
             Pay securely online using the link below.
           </p>
           <a href="${portalUrl}/invoices"
             style="display:inline-block;background:#0ABAB5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
             View &amp; Pay Invoice
           </a>`
        ),
      };

    case "CANCELLED":
      return {
        subject: `Appointment Cancelled – ${dateStr}`,
        html: wrap(
          "Appointment cancelled",
          `<p style="margin:0 0 12px;color:#374151">Hi ${firstName},</p>
           <p style="margin:0;color:#374151">
             Your inspection at <strong>${propertyName}</strong> scheduled for
             <strong>${dateStr} at ${timeStr}</strong> has been cancelled.
             Please contact us if you'd like to reschedule.
           </p>`
        ),
      };
  }
}

export async function notifyOnStatusChange(
  appointmentId: string,
  newStatus: string
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
    };

    const trigger = newStatus as NotificationTrigger;
    const { subject, html } = buildTemplate(trigger, ctx);
    const notifType = NOTIFICATION_TYPE_MAP[trigger];

    if (resend) {
      await resend.emails.send({ from: FROM, to: apt.customer.email, subject, html });
    } else {
      console.log(`[NOTIFY] Would email ${apt.customer.email}: ${subject}`);
    }

    // Record in DB against the customer record (customers are not always app users)
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
  } catch (err) {
    console.error("[NOTIFY]", err);
  }
}
