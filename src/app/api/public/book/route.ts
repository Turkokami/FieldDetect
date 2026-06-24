import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@fielddetect.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";

const schema = z.object({
  orgSlug: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  propertyName: z.string().optional(),
  addressLine1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zip: z.string().min(5),
  serviceType: z.enum([
    "BED_BUG_INSPECTION", "BED_BUG_TREATMENT", "RODENT_INSPECTION",
    "RODENT_EXCLUSION", "WILDLIFE_INSPECTION", "WILDLIFE_REMOVAL",
    "BIRD_EXCLUSION", "GOOSE_CONTROL", "GENERAL_PEST_INSPECTION",
    "GENERAL_PEST_TREATMENT", "OTHER",
  ]).default("BED_BUG_INSPECTION"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const org = await prisma.organization.findUnique({ where: { slug: data.orgSlug } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer by email within this org
      let customer = await tx.customer.findFirst({
        where: { organizationId: org.id, email: data.email },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            organizationId: org.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName,
            customerType: data.companyName ? "COMMERCIAL" : "RESIDENTIAL",
          },
        });
      }

      const property = await tx.property.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          name: data.propertyName || `${data.addressLine1}, ${data.city}`,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          zip: data.zip,
        },
      });

      const scheduledDate = data.preferredDate
        ? new Date(`${data.preferredDate}T${data.preferredTime ?? "09:00"}:00`)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 3);
            d.setHours(9, 0, 0, 0);
            return d;
          })();

      const appointment = await tx.appointment.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          propertyId: property.id,
          serviceType: data.serviceType,
          status: "REQUESTED",
          scheduledDate,
          description: data.notes,
        },
      });

      return { customer, property, appointment };
    });

    // Notify org admins
    const admins = await prisma.user.findMany({
      where: { organizationId: org.id, role: { in: ["OWNER", "ADMIN"] }, isActive: true },
      select: { email: true },
    });

    const SERVICE_LABELS: Record<string, string> = {
      BED_BUG_INSPECTION: "Bed Bug Inspection", BED_BUG_TREATMENT: "Bed Bug Treatment",
      RODENT_INSPECTION: "Rodent Inspection", RODENT_EXCLUSION: "Rodent Exclusion",
      GENERAL_PEST_INSPECTION: "General Pest Inspection", OTHER: "Other",
    };
    const serviceLabel = SERVICE_LABELS[data.serviceType] ?? data.serviceType.replace(/_/g, " ");

    const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">New Booking Request 📋</h2>
        <p style="color:#374151;margin:0 0 16px">A new service request has been submitted for <strong>${org.name}</strong>.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
          <div style="margin-bottom:8px"><strong>${data.firstName} ${data.lastName}</strong>${data.companyName ? ` · ${data.companyName}` : ""}</div>
          <div style="color:#6b7280;font-size:14px">${data.email}${data.phone ? ` · ${data.phone}` : ""}</div>
          <div style="color:#6b7280;font-size:14px;margin-top:8px">📍 ${data.addressLine1}, ${data.city}, ${data.state} ${data.zip}</div>
          <div style="color:#6b7280;font-size:14px;margin-top:4px">🔧 ${serviceLabel}</div>
          ${data.preferredDate ? `<div style="color:#6b7280;font-size:14px;margin-top:4px">🗓 Preferred: ${new Date(data.preferredDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>` : ""}
          ${data.notes ? `<div style="color:#6b7280;font-size:14px;margin-top:8px;font-style:italic">"${data.notes}"</div>` : ""}
        </div>
        <a href="${APP_URL}/scheduling/${result.appointment.id}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
          Review Request →
        </a>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · New booking request via /book/${data.orgSlug}</p>
      </div>
    </div>`;

    if (resend && admins.length > 0) {
      await resend.emails.send({
        from: FROM,
        to: admins.map((a) => a.email),
        subject: `New Booking Request — ${data.firstName} ${data.lastName} · ${serviceLabel}`,
        html: adminHtml,
      });
    }

    // Confirmation email to customer
    const confirmHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:linear-gradient(135deg,#0ABAB5,#0D9488);padding:20px 24px;border-radius:10px 10px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:800">🐾 FieldDetect</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none">
        <h2 style="margin:0 0 16px;font-size:19px;color:#111827;font-weight:700">We received your request! ✅</h2>
        <p style="color:#374151;margin:0 0 16px">Hi ${data.firstName}, thanks for reaching out to <strong>${org.name}</strong>!</p>
        <p style="color:#374151;margin:0 0 16px">We've received your request for a <strong>${serviceLabel}</strong> at ${data.addressLine1}, ${data.city}. Our team will review it and be in touch shortly to confirm your appointment time.</p>
        <div style="background:#f0fdf9;border:1px solid #a7f3d0;border-radius:8px;padding:14px">
          <div style="font-size:12px;font-weight:600;color:#065f46;margin-bottom:4px">What happens next?</div>
          <ol style="margin:0;padding-left:18px;color:#374151;font-size:13px">
            <li>We'll review your request and confirm availability</li>
            <li>You'll get a confirmation email with the exact appointment time</li>
            <li>Our K9 team will arrive ready to inspect</li>
          </ol>
        </div>
      </div>
      <div style="background:#f9fafb;padding:12px 24px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0;font-size:11px;color:#9ca3af">FieldDetect · K9 Inspection Services · ${org.name}</p>
      </div>
    </div>`;

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to: data.email,
        subject: `Request Received — ${org.name} will be in touch soon`,
        html: confirmHtml,
      });
    }

    return NextResponse.json({ data: { appointmentId: result.appointment.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[PUBLIC_BOOK]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
