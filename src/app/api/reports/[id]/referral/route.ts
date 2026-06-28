import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { PestControlReferralPDF } from "@/components/reports/pest-control-referral-pdf";

const TREATMENT_RESULTS = new Set(["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"]);

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

    const inspection = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        property: { include: { customer: true } },
        technician: true,
        k9Dog: true,
        inspectionUnits: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!inspection) return new NextResponse("Not found", { status: 404 });

    // Include units that triggered treatment referral OR had positive/visual results
    const referralUnits = inspection.inspectionUnits.filter(
      (u) => TREATMENT_RESULTS.has(u.detectionResult) || u.treatmentReferral
    );

    if (referralUnits.length === 0) {
      return new NextResponse("No units flagged for treatment in this inspection", { status: 422 });
    }

    const org = user.organization;
    const property = inspection.property;

    const element = React.createElement(PestControlReferralPDF, {
      org: {
        name: org.name,
        addressLine1: org.addressLine1 ?? null,
        city: org.city ?? null,
        state: org.state ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
        website: org.website ?? null,
        logoUrl: org.logoUrl ?? null,
      },
      property: {
        name: property.name,
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2 ?? null,
        city: property.city,
        state: property.state,
        zip: property.zip,
      },
      inspection: {
        inspectionNumber: inspection.inspectionNumber,
        serviceType: inspection.serviceType,
        startTime: inspection.startTime,
        technician: `${inspection.technician.firstName} ${inspection.technician.lastName}`,
        k9Dog: inspection.k9Dog ? inspection.k9Dog.name : null,
        summaryNotes: inspection.summaryNotes ?? null,
        recommendations: inspection.recommendations ?? null,
      },
      units: referralUnits.map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        buildingName: u.buildingName ?? null,
        floor: u.floor ?? null,
        unitType: u.unitType,
        detectionResult: u.detectionResult,
        severityLevel: u.severityLevel ?? null,
        alertLocation: u.alertLocation ?? null,
        visualEvidence: u.visualEvidence,
        visualNotes: u.visualNotes ?? null,
        technicianNotes: u.technicianNotes ?? null,
        recommendations: u.recommendations ?? null,
      })),
    });

    const pdfStream = await pdf(element as React.ReactElement<DocumentProps>).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const filename = `pest-control-referral-${inspection.inspectionNumber}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[REFERRAL_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
