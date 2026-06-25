import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { sendSms } from "@/lib/sms";
import { randomBytes } from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "notifications@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: { select: { googleReviewUrl: true, name: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN", "TECHNICIAN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const inspection = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        property: {
          include: { customer: true },
        },
        appointment: true,
      },
    });
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { channel = "email" } = body as { channel?: "email" | "sms" | "both" };

    // Generate or reuse token
    const token = inspection.reviewToken ?? randomBytes(20).toString("hex");
    if (!inspection.reviewToken) {
      await prisma.inspection.update({
        where: { id },
        data: { reviewToken: token, reviewRequestedAt: new Date() },
      });
    } else {
      await prisma.inspection.update({
        where: { id },
        data: { reviewRequestedAt: new Date() },
      });
    }

    const customer = inspection.property.customer;
    const reviewUrl = `${APP_URL}/review/${token}`;
    const orgName = user.organization.name;
    const googleReviewUrl = user.organization.googleReviewUrl;
    const propertyName = inspection.property.name;

    const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">🐾 ${orgName}</span>
      </div>
      <div style="background:#ffffff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">How was your inspection? ⭐</h2>
        <p style="color:#374151;margin:0 0 12px">Hi ${customer.firstName},</p>
        <p style="color:#374151;margin:0 0 16px">
          Thank you for choosing ${orgName} for your K9 bed bug inspection at <strong>${propertyName}</strong>.
          We'd love to hear your feedback!
        </p>
        <a href="${reviewUrl}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:4px">
          Rate Your Experience →
        </a>
        ${googleReviewUrl ? `
        <div style="margin-top:20px;padding:14px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px">
          <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:6px">⭐ Already satisfied? Leave us a Google Review!</div>
          <a href="${googleReviewUrl}" style="display:inline-block;background:#4285F4;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Google Review</a>
        </div>` : ""}
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · K9 Inspection Services · Automated notification</p>
      </div>
    </div>`;

    const smsBody = `${orgName}: How was your K9 inspection at ${propertyName}? Rate your experience: ${reviewUrl}${googleReviewUrl ? `\n\nOr leave us a Google review: ${googleReviewUrl}` : ""}`;

    let emailSent = false;
    let smsSent = false;

    if ((channel === "email" || channel === "both") && customer.email) {
      if (resend) {
        await resend.emails.send({
          from: FROM,
          to: customer.email,
          subject: `How was your inspection? — ${orgName}`,
          html: emailHtml,
        });
      }
      emailSent = true;
    }

    if ((channel === "sms" || channel === "both") && customer.phone) {
      smsSent = await sendSms(customer.phone, smsBody);
    }

    return NextResponse.json({ data: { token, reviewUrl, emailSent, smsSent } });
  } catch (error) {
    console.error("[REVIEW_REQUEST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
