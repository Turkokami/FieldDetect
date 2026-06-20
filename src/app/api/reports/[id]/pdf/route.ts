import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatPhone } from "@/lib/utils";

const DETECTION_LABEL: Record<string, string> = {
  NEGATIVE: "Negative — No Detection",
  POSITIVE_K9_ALERT: "Positive K9 Alert",
  VISUAL_CONFIRMATION: "Visual Confirmation",
  INCONCLUSIVE: "Inconclusive",
  UNABLE_TO_INSPECT: "Unable to Inspect",
  ACCESS_DENIED: "Access Denied",
  FOLLOW_UP_REQUIRED: "Follow-Up Required",
};

const SEVERITY_LABEL: Record<string, string> = {
  NONE: "—",
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  SEVERE: "Severe",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      include: { organization: true },
    });
    if (!user) return new NextResponse("User not found", { status: 404 });

    const { id } = await params;
    const inspection = await prisma.inspection.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        property: {
          include: {
            customer: { include: { contacts: true } },
            buildings: true,
          },
        },
        technician: true,
        k9Team: true,
        k9Dog: true,
        inspectionUnits: {
          include: { photos: true },
          orderBy: { sortOrder: "asc" },
        },
        photos: true,
      },
    });

    if (!inspection) return new NextResponse("Not found", { status: 404 });

    const org = user.organization;
    const customer = inspection.property.customer;
    const property = inspection.property;
    const units = inspection.inspectionUnits;

    // Generate HTML report (in production, use puppeteer or @react-pdf/renderer)
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inspection Report — ${inspection.inspectionNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #0f172a; }
  .company-name { font-size: 22px; font-weight: 800; color: #0f172a; }
  .company-info { font-size: 11px; color: #64748b; margin-top: 4px; }
  .report-title { text-align: right; }
  .report-title h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
  .report-title p { font-size: 11px; color: #64748b; margin-top: 2px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-block { }
  .info-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .summary-card { padding: 12px; border-radius: 8px; text-align: center; border: 1px solid; }
  .summary-card.negative { background: #f0fdf4; border-color: #bbf7d0; }
  .summary-card.positive { background: #fef2f2; border-color: #fecaca; }
  .summary-card.inconclusive { background: #fefce8; border-color: #fef08a; }
  .summary-card.inaccessible { background: #f8fafc; border-color: #e2e8f0; }
  .summary-num { font-size: 28px; font-weight: 800; }
  .summary-num.negative { color: #16a34a; }
  .summary-num.positive { color: #dc2626; }
  .summary-num.inconclusive { color: #ca8a04; }
  .summary-num.inaccessible { color: #64748b; }
  .summary-label { font-size: 10px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:hover td { background: #fafafa; }
  .result-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
  .result-NEGATIVE { background: #dcfce7; color: #15803d; }
  .result-POSITIVE_K9_ALERT { background: #fee2e2; color: #b91c1c; }
  .result-VISUAL_CONFIRMATION { background: #fecaca; color: #991b1b; }
  .result-INCONCLUSIVE { background: #fef9c3; color: #92400e; }
  .result-UNABLE_TO_INSPECT { background: #f1f5f9; color: #64748b; }
  .result-ACCESS_DENIED { background: #f1f5f9; color: #475569; }
  .result-FOLLOW_UP_REQUIRED { background: #ffedd5; color: #c2410c; }
  .disclaimer { font-size: 10px; color: #94a3b8; padding: 12px; background: #f8fafc; border-radius: 6px; line-height: 1.6; }
  .signature-section { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .sig-line { border-bottom: 1px solid #94a3b8; height: 60px; }
  .sig-label { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  @media print { .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">🐾 ${org.name}</div>
      <div class="company-info">
        ${org.addressLine1 ? `${org.addressLine1}, ` : ""}${org.city ? `${org.city}, ` : ""}${org.state ?? ""}
        ${org.phone ? `<br>${formatPhone(org.phone)}` : ""}
        ${org.email ? `<br>${org.email}` : ""}
        ${org.licenseNumber ? `<br>License: ${org.licenseNumber}` : ""}
      </div>
    </div>
    <div class="report-title">
      <h1>INSPECTION REPORT</h1>
      <p>${inspection.inspectionNumber}</p>
      <p>${formatDate(inspection.startTime)}</p>
    </div>
  </div>

  <!-- Customer & Property -->
  <div class="section">
    <div class="section-title">Customer & Property Information</div>
    <div class="info-grid">
      <div>
        <div class="info-block" style="margin-bottom:12px">
          <div class="info-label">Customer</div>
          <div class="info-value">${customer.companyName ?? `${customer.firstName} ${customer.lastName}`}</div>
          ${customer.companyName ? `<div style="color:#64748b;font-size:11px">${customer.firstName} ${customer.lastName}</div>` : ""}
          ${customer.phone ? `<div style="color:#64748b;font-size:11px">${formatPhone(customer.phone)}</div>` : ""}
          ${customer.email ? `<div style="color:#64748b;font-size:11px">${customer.email}</div>` : ""}
        </div>
      </div>
      <div>
        <div class="info-block">
          <div class="info-label">Property</div>
          <div class="info-value">${property.name}</div>
          <div style="color:#64748b;font-size:11px">
            ${property.addressLine1}${property.addressLine2 ? `, ${property.addressLine2}` : ""}<br>
            ${property.city}, ${property.state} ${property.zip}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Inspection Details -->
  <div class="section">
    <div class="section-title">Inspection Details</div>
    <div class="info-grid">
      <div class="info-block">
        <div class="info-label">Service Type</div>
        <div class="info-value">${inspection.serviceType.replace(/_/g, " ")}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Technician / K9 Handler</div>
        <div class="info-value">${inspection.technician.firstName} ${inspection.technician.lastName}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Start Time</div>
        <div class="info-value">${formatDateTime(inspection.startTime)}</div>
      </div>
      ${inspection.endTime ? `
      <div class="info-block">
        <div class="info-label">End Time</div>
        <div class="info-value">${formatDateTime(inspection.endTime)}</div>
      </div>` : ""}
      ${inspection.k9Dog ? `
      <div class="info-block">
        <div class="info-label">K9 Dog</div>
        <div class="info-value">${inspection.k9Dog.name}${inspection.k9Dog.breed ? ` (${inspection.k9Dog.breed})` : ""}</div>
      </div>` : ""}
      ${inspection.weather ? `
      <div class="info-block">
        <div class="info-label">Weather Conditions</div>
        <div class="info-value">${inspection.weather}${inspection.temperature ? ` · ${inspection.temperature}°F` : ""}</div>
      </div>` : ""}
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">Results Summary</div>
    <div class="summary-grid">
      <div class="summary-card negative">
        <div class="summary-num negative">${inspection.totalNegative}</div>
        <div class="summary-label">Negative</div>
      </div>
      <div class="summary-card positive">
        <div class="summary-num positive">${inspection.totalPositive}</div>
        <div class="summary-label">Positive</div>
      </div>
      <div class="summary-card inconclusive">
        <div class="summary-num inconclusive">${inspection.totalInconclusive}</div>
        <div class="summary-label">Inconclusive</div>
      </div>
      <div class="summary-card inaccessible">
        <div class="summary-num inaccessible">${inspection.totalInaccessible}</div>
        <div class="summary-label">Inaccessible</div>
      </div>
    </div>
    ${inspection.overallResult ? `
    <div style="text-align:center;padding:10px;border-radius:6px;font-weight:700;font-size:14px;"
         class="result-badge result-${inspection.overallResult}">
      Overall Result: ${DETECTION_LABEL[inspection.overallResult] ?? inspection.overallResult}
    </div>` : ""}
  </div>

  <!-- Unit Results Table -->
  ${units.length > 0 ? `
  <div class="section">
    <div class="section-title">Unit-by-Unit Results (${units.length} units inspected)</div>
    <table>
      <thead>
        <tr>
          <th>Unit #</th>
          <th>Building</th>
          <th>Floor</th>
          <th>Type</th>
          <th>Result</th>
          <th>Severity</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${units.map((u) => `
        <tr>
          <td><strong>${u.unitNumber}</strong></td>
          <td>${u.buildingName ?? "—"}</td>
          <td>${u.floor ?? "—"}</td>
          <td>${u.unitType.replace(/_/g, " ")}</td>
          <td><span class="result-badge result-${u.detectionResult}">${DETECTION_LABEL[u.detectionResult] ?? u.detectionResult}</span></td>
          <td>${SEVERITY_LABEL[u.severityLevel] ?? "—"}</td>
          <td>${u.technicianNotes ? u.technicianNotes.substring(0, 100) + (u.technicianNotes.length > 100 ? "..." : "") : "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Summary Notes & Recommendations -->
  ${inspection.summaryNotes ? `
  <div class="section">
    <div class="section-title">Summary of Findings</div>
    <p style="font-size:12px;color:#334155;line-height:1.7">${inspection.summaryNotes}</p>
  </div>` : ""}

  ${inspection.recommendations ? `
  <div class="section">
    <div class="section-title">Recommendations</div>
    <p style="font-size:12px;color:#334155;line-height:1.7">${inspection.recommendations}</p>
  </div>` : ""}

  <!-- Flags -->
  ${inspection.followUpRequired || inspection.treatmentReferral ? `
  <div class="section" style="background:#fff7ed;padding:12px;border-radius:8px;border:1px solid #fed7aa">
    ${inspection.followUpRequired ? `<p style="color:#c2410c;font-weight:600;font-size:12px">⚠ Follow-Up Inspection Required${inspection.followUpDate ? ` · ${formatDate(inspection.followUpDate)}` : ""}</p>` : ""}
    ${inspection.treatmentReferral ? `<p style="color:#b91c1c;font-weight:600;font-size:12px;margin-top:4px">⚠ Treatment Referral Recommended</p>` : ""}
  </div>` : ""}

  <!-- Disclaimer -->
  <div class="section">
    <div class="disclaimer">
      <strong>Disclaimer:</strong> This report reflects the findings of a K9 scent detection inspection conducted on the date and at the property specified above. K9 detection is a tool used to identify areas of potential bed bug activity and is not a guarantee of infestation or non-infestation. Visual confirmation is recommended to verify K9 alerts. Results are based on conditions observed at the time of inspection. ${org.name} is not responsible for conditions that change after the inspection date. This report is intended for the exclusive use of the named customer.
    </div>
  </div>

  <!-- Signatures -->
  <div class="signature-section">
    <div>
      <div class="sig-line">${inspection.customerSignature ? `<div style="padding:10px;font-style:italic;color:#475569">[Signed electronically]</div>` : ""}</div>
      <div class="sig-label">Customer Signature / Acknowledgment</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Technician / K9 Handler: ${inspection.technician.firstName} ${inspection.technician.lastName}</div>
    </div>
  </div>

</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="report-${inspection.inspectionNumber}.html"`,
      },
    });
  } catch (error) {
    console.error("[REPORT_PDF]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
