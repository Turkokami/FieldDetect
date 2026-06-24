import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "DISPATCHER", "TECHNICIAN"]).default("TECHNICIAN"),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, role } = schema.parse(body);

    const existingUser = await prisma.user.findFirst({
      where: { email, organizationId: user.organizationId, isActive: true },
    });
    if (existingUser) {
      return NextResponse.json({ error: "This email is already part of your team" }, { status: 409 });
    }

    const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Upsert: replace any existing pending invite for this email+org
    await prisma.staffInvitation.deleteMany({
      where: { email, organizationId: user.organizationId, acceptedAt: null },
    });
    const invitation = await prisma.staffInvitation.create({
      data: { organizationId: user.organizationId, email, role, expiresAt, invitedById: user.id },
    });

    const joinUrl = `${APP_URL}/join/${invitation.token}`;
    const roleLabel = role === "ADMIN" ? "Admin" : role === "DISPATCHER" ? "Dispatcher" : "Technician";
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">You've been invited to join ${org.name}</h2>
        <p style="color:#374151;margin:0 0 16px">
          <strong>${user.firstName} ${user.lastName}</strong> has invited you to join the
          <strong>${org.name}</strong> team on FieldDetect as a <strong>${roleLabel}</strong>.
        </p>
        <p style="color:#374151;margin:0 0 24px">
          FieldDetect is a K9 inspection management platform for scheduling, inspections, and reporting.
        </p>
        <a href="${joinUrl}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Accept Invitation →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
        </p>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · K9 Inspection Services</p>
      </div>
    </div>`;

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `You're invited to join ${org.name} on FieldDetect`,
        html,
      });
    } else {
      console.log(`[INVITE] Email to ${email}: ${joinUrl}`);
    }

    return NextResponse.json({ data: { id: invitation.id, email, role } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[STAFF_INVITE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.staffInvitation.findMany({
      where: { organizationId: user.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error("[STAFF_INVITE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
