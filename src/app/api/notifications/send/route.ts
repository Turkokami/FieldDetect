import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const sendSchema = z.object({
  type: z.enum([
    "APPOINTMENT_CONFIRMED", "APPOINTMENT_REMINDER", "APPOINTMENT_CANCELLED",
    "TECHNICIAN_EN_ROUTE", "INSPECTION_COMPLETE", "REPORT_READY",
    "INVOICE_SENT", "PAYMENT_RECEIVED", "FOLLOW_UP_REQUIRED", "GENERAL",
  ]),
  recipientType: z.enum(["customer", "technician", "internal"]),
  recipientId: z.string().optional(),
  email: z.string().email().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
  appointmentId: z.string().optional(),
  channels: z.array(z.enum(["EMAIL", "SMS", "IN_APP", "PUSH"])).default(["EMAIL"]),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const validated = sendSchema.parse(body);

    const results: { channel: string; success: boolean; error?: string }[] = [];

    for (const channel of validated.channels) {
      if (channel === "EMAIL") {
        const toEmail = validated.email;
        if (!toEmail) {
          results.push({ channel: "EMAIL", success: false, error: "No email address" });
          continue;
        }

        if (resend) {
          const fromEmail = process.env.RESEND_FROM_EMAIL ?? "notifications@fielddetect.com";
          try {
            await resend.emails.send({
              from: fromEmail,
              to: toEmail,
              subject: validated.subject,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                ${validated.body.replace(/\n/g, "<br>")}
              </div>`,
            });
            results.push({ channel: "EMAIL", success: true });
          } catch (err) {
            results.push({
              channel: "EMAIL",
              success: false,
              error: err instanceof Error ? err.message : "Send failed",
            });
          }
        } else {
          console.log(`[NOTIFICATION_EMAIL] Would send to ${toEmail}: ${validated.subject}`);
          results.push({ channel: "EMAIL", success: true });
        }
      }

      if (channel === "IN_APP" && validated.recipientId) {
        await prisma.notification.create({
          data: {
            organizationId: user.organizationId,
            userId: validated.recipientId,
            type: validated.type,
            channel: "IN_APP",
            subject: validated.subject,
            body: validated.body,
            appointmentId: validated.appointmentId,
          },
        });
        results.push({ channel: "IN_APP", success: true });
      }

      if (channel === "SMS") {
        // SMS integration placeholder (Twilio, etc.)
        console.log(`[NOTIFICATION_SMS] SMS not configured. Would send: ${validated.subject}`);
        results.push({ channel: "SMS", success: false, error: "SMS not configured" });
      }
    }

    return NextResponse.json({ data: { results } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[NOTIFICATIONS_SEND]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
