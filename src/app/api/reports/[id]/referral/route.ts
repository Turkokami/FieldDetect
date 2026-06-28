import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { PestControlReferralPDF } from "@/components/reports/pest-control-referral-pdf";
import { Resend } from "resend";
import { z } from "zod";

const TREATMENT_RESULTS = new Set(["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"]);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function buildReferralPdf(
  org: { name: string; addressLine1: string | null; city: string | null; state: string | null; phone: string | null; email: string | null; website: string | null; logoUrl: string | null },
  property: { name: string; addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string },
  inspection: { inspectionNumber: string; serviceType: string; startTime: Date | null; technician: string; k9Dog: string | null; summaryNotes: string | null; recommendations: string | null },
  units: { id: string; unitNumber: string; buildingName: string | null; floor: string | null; unitType: string; detectionResult: string; severityLevel: string | null; alertLocation: string | null; visualEvidence: boolean; visualNotes: string | null; technicianNotes: string | null; recommendations: string | null }[]
): Promise<Buffer> {
  const element = React.createElement(PestControlReferralPDF, { org, property, inspection, units });
  const pdfStream = await pdf(element as React.ReactElement<DocumentProps>).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
  }
  return Buffer.concat(chunks);
}

async function getInspectionData(id: string, organizationId: string) {
  return prisma.inspection.findFirst({
    where: { id, organizationId },
    include: {
      property: { include: { customer: true } },
      technician: true,
      k9Dog: true,
      inspectionUnits: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const inspection = await getInspectionData(id, user.organizationId);
    if (!inspection) return new NextResponse("Not found", { status: 404 });

    const referralUnits = inspection.inspectionUnits.filter(
      (u) => TREATMENT_RESULTS.has(u.detectionResult) || u.treatmentReferral
    );
    if (referralUnits.length === 0) {
      return new NextResponse("No units flagged for treatment in this inspection", { status: 422 });
    }

    const org = user.organization;
    const property = inspection.property;

    const pdfBuffer = await buildReferralPdf(
      { name: org.name, addressLine1: org.addressLine1 ?? null, city: org.city ?? null, state: org.state ?? null, phone: org.phone ?? null, email: org.email ?? null, website: org.website ?? null, logoUrl: org.logoUrl ?? null },
      { name: property.name, addressLine1: property.addressLine1, addressLine2: property.addressLine2 ?? null, city: property.city, state: property.state, zip: property.zip },
      { inspectionNumber: inspection.inspectionNumber, serviceType: inspection.serviceType, startTime: inspection.startTime, technician: `${inspection.technician.firstName} ${inspection.technician.lastName}`, k9Dog: inspection.k9Dog ? inspection.k9Dog.name : null, summaryNotes: inspection.summaryNotes ?? null, recommendations: inspection.recommendations ?? null },
      referralUnits.map((u) => ({ id: u.id, unitNumber: u.unitNumber, buildingName: u.buildingName ?? null, floor: u.floor ?? null, unitType: u.unitType, detectionResult: u.detectionResult, severityLevel: u.severityLevel ?? null, alertLocation: u.alertLocation ?? null, visualEvidence: u.visualEvidence, visualNotes: u.visualNotes ?? null, technicianNotes: u.technicianNotes ?? null, recommendations: u.recommendations ?? null }))
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="pest-control-referral-${inspection.inspectionNumber}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[REFERRAL_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

const sendSchema = z.object({
  to: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { to } = sendSchema.parse(body);

    const { id } = await params;
    const inspection = await getInspectionData(id, user.organizationId);
    if (!inspection) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const referralUnits = inspection.inspectionUnits.filter(
      (u) => TREATMENT_RESULTS.has(u.detectionResult) || u.treatmentReferral
    );
    if (referralUnits.length === 0) {
      return NextResponse.json({ error: "No units flagged for treatment" }, { status: 422 });
    }

    const org = user.organization;
    const property = inspection.property;

    const pdfBuffer = await buildReferralPdf(
      { name: org.name, addressLine1: org.addressLine1 ?? null, city: org.city ?? null, state: org.state ?? null, phone: org.phone ?? null, email: org.email ?? null, website: org.website ?? null, logoUrl: org.logoUrl ?? null },
      { name: property.name, addressLine1: property.addressLine1, addressLine2: property.addressLine2 ?? null, city: property.city, state: property.state, zip: property.zip },
      { inspectionNumber: inspection.inspectionNumber, serviceType: inspection.serviceType, startTime: inspection.startTime, technician: `${inspection.technician.firstName} ${inspection.technician.lastName}`, k9Dog: inspection.k9Dog ? inspection.k9Dog.name : null, summaryNotes: inspection.summaryNotes ?? null, recommendations: inspection.recommendations ?? null },
      referralUnits.map((u) => ({ id: u.id, unitNumber: u.unitNumber, buildingName: u.buildingName ?? null, floor: u.floor ?? null, unitType: u.unitType, detectionResult: u.detectionResult, severityLevel: u.severityLevel ?? null, alertLocation: u.alertLocation ?? null, visualEvidence: u.visualEvidence, visualNotes: u.visualNotes ?? null, technicianNotes: u.technicianNotes ?? null, recommendations: u.recommendations ?? null }))
    );

    const ccEmails = (org as { ccEmails?: string[] }).ccEmails ?? [];
    const filename = `pest-control-referral-${inspection.inspectionNumber}.pdf`;

    if (resend) {
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "reports@fielddetect.com";
      await resend.emails.send({
        from: fromEmail,
        to,
        ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
        subject: `Pest Control Treatment Referral — ${property.name} (Inspection #${inspection.inspectionNumber})`,
        html: buildReferralEmailHtml({ org, inspection, property, unitCount: referralUnits.length }),
        attachments: [{ filename, content: pdfBuffer }],
      });
    } else {
      console.log(`[REFERRAL_EMAIL] Would send referral to ${to} for inspection ${inspection.inspectionNumber}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error("[REFERRAL_EMAIL]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildReferralEmailHtml({
  org,
  inspection,
  property,
  unitCount,
}: {
  org: { name: string; logoUrl: string | null; phone: string | null; email: string | null };
  inspection: { inspectionNumber: string };
  property: { name: string; addressLine1: string; city: string; state: string; zip: string };
  unitCount: number;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:#b91c1c;padding:20px 28px;display:flex;align-items:center;gap:12px">
    ${org.logoUrl ? `<img src="${org.logoUrl}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover">` : ""}
    <div>
      <div style="color:#fecaca;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Pest Control Treatment Referral</div>
      <div style="color:#fff;font-size:18px;font-weight:800">${org.name}</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:28px">
    <p style="margin:0 0 16px;color:#374151;font-size:15px">
      Please find the attached pest control treatment referral for <strong>${property.name}</strong>.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px">
      <div style="font-size:13px;color:#7f1d1d;font-weight:700;margin-bottom:8px">Referral Summary</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 0;width:140px">Inspection #</td>
          <td style="font-size:13px;color:#1e293b;font-weight:600">#${inspection.inspectionNumber}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 0">Property</td>
          <td style="font-size:13px;color:#1e293b;font-weight:600">${property.name}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 0">Address</td>
          <td style="font-size:13px;color:#1e293b">${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:4px 0">Units flagged</td>
          <td style="font-size:13px;color:#b91c1c;font-weight:700">${unitCount} unit${unitCount !== 1 ? "s" : ""} require treatment</td>
        </tr>
      </table>
    </div>
    <p style="margin:0;color:#374151;font-size:14px">
      The attached PDF contains detailed unit-by-unit findings including detection results, severity levels, and alert locations. Please review before scheduling treatment.
    </p>
  </div>

  <!-- Footer -->
  <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">
      ${org.name}${org.phone ? ` · ${org.phone}` : ""}${org.email ? ` · ${org.email}` : ""}
    </p>
  </div>
</div>
</body>
</html>`;
}
