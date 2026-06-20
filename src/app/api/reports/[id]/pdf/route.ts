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

const DETECTION_EMOJI: Record<string, string> = {
  NEGATIVE: "✅",
  POSITIVE_K9_ALERT: "🚨",
  VISUAL_CONFIRMATION: "👁",
  INCONCLUSIVE: "❓",
  UNABLE_TO_INSPECT: "🚫",
  ACCESS_DENIED: "⛔",
  FOLLOW_UP_REQUIRED: "📋",
};

const SEVERITY_LABEL: Record<string, string> = {
  NONE: "—",
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  SEVERE: "Severe",
};

const SEVERITY_COLOR: Record<string, string> = {
  NONE: "#64748b",
  LOW: "#16a34a",
  MODERATE: "#d97706",
  HIGH: "#dc2626",
  SEVERE: "#7c2d12",
};

const ALERT_RESULTS = new Set(["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"]);

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
        k9Team: { include: { dogs: true, members: { include: { user: true } } } },
        k9Dog: true,
        inspectionUnits: {
          include: { photos: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        photos: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!inspection) return new NextResponse("Not found", { status: 404 });

    const org = user.organization;
    const customer = inspection.property.customer;
    const property = inspection.property;
    const units = inspection.inspectionUnits;
    const positiveUnits = units.filter((u) => ALERT_RESULTS.has(u.detectionResult));
    const inconclusiveUnits = units.filter((u) => u.detectionResult === "INCONCLUSIVE" || u.detectionResult === "FOLLOW_UP_REQUIRED");
    const allPhotos = units.flatMap((u) => u.photos);
    const durationMs = inspection.endTime && inspection.startTime
      ? new Date(inspection.endTime).getTime() - new Date(inspection.startTime).getTime()
      : null;
    const durationMin = durationMs ? Math.round(durationMs / 60000) : null;

    // Group units by building for the matrix
    const buildingGroups = new Map<string, typeof units>();
    for (const u of units) {
      const key = u.buildingName ?? "—";
      if (!buildingGroups.has(key)) buildingGroups.set(key, []);
      buildingGroups.get(key)!.push(u);
    }

    const renderPhotoGrid = (photos: { url: string; filename: string; caption: string | null }[], max = 6) => {
      const shown = photos.slice(0, max);
      if (shown.length === 0) return "";
      return `
        <div style="display:grid;grid-template-columns:repeat(${Math.min(shown.length, 3)},1fr);gap:8px;margin-top:10px">
          ${shown.map((ph) => `
            <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
              <img src="${ph.url}" alt="${ph.caption ?? ph.filename}"
                   style="width:100%;height:120px;object-fit:cover;display:block"
                   loading="eager" crossorigin="anonymous" />
              ${ph.caption ? `<div style="padding:4px 6px;font-size:9px;color:#64748b;background:#f8fafc">${ph.caption}</div>` : ""}
            </div>`).join("")}
        </div>
        ${photos.length > max ? `<p style="font-size:10px;color:#94a3b8;margin-top:6px">${photos.length - max} more photo${photos.length - max > 1 ? "s" : ""} not shown.</p>` : ""}`;
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Inspection Report — ${inspection.inspectionNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; background: #fff; }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 40px; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 3px solid #0f172a; }
  .brand-bar { display: flex; align-items: center; gap: 14px; }
  .brand-icon { width: 56px; height: 56px; background: #0f172a; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
  .company-name { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
  .company-tagline { font-size: 10px; color: #64748b; margin-top: 2px; }
  .company-meta { font-size: 10px; color: #64748b; margin-top: 6px; line-height: 1.7; }
  .report-meta { text-align: right; }
  .report-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; margin-bottom: 8px; }
  .report-number { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .report-date { font-size: 11px; color: #64748b; margin-top: 4px; }

  /* ── Overall result banner ── */
  .result-banner { padding: 14px 20px; border-radius: 10px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; }
  .result-banner.positive { background: #fef2f2; border: 2px solid #fca5a5; }
  .result-banner.negative { background: #f0fdf4; border: 2px solid #86efac; }
  .result-banner.inconclusive { background: #fefce8; border: 2px solid #fde047; }
  .result-banner-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .result-banner-label.positive { color: #dc2626; }
  .result-banner-label.negative { color: #16a34a; }
  .result-banner-label.inconclusive { color: #ca8a04; }
  .result-banner-value { font-size: 15px; font-weight: 800; }
  .result-banner-value.positive { color: #b91c1c; }
  .result-banner-value.negative { color: #15803d; }
  .result-banner-value.inconclusive { color: #92400e; }

  /* ── Section ── */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }

  /* ── Info grids ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .info-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .info-block { }
  .info-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .info-value { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 2px; }
  .info-sub { font-size: 11px; color: #64748b; margin-top: 1px; }

  /* ── Summary cards ── */
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
  .summary-card { padding: 14px 10px; border-radius: 10px; text-align: center; border: 1px solid; }
  .summary-card.negative { background: #f0fdf4; border-color: #86efac; }
  .summary-card.positive { background: #fef2f2; border-color: #fca5a5; }
  .summary-card.inconclusive { background: #fefce8; border-color: #fde047; }
  .summary-card.inaccessible { background: #f8fafc; border-color: #cbd5e1; }
  .summary-card.followup { background: #fff7ed; border-color: #fdba74; }
  .summary-num { font-size: 30px; font-weight: 900; line-height: 1; }
  .summary-num.negative { color: #16a34a; }
  .summary-num.positive { color: #dc2626; }
  .summary-num.inconclusive { color: #ca8a04; }
  .summary-num.inaccessible { color: #64748b; }
  .summary-num.followup { color: #ea580c; }
  .summary-label { font-size: 9px; color: #64748b; margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; border-bottom: 2px solid #e2e8f0; font-weight: 700; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr.alert-row td { background: #fef2f2; }
  tr.followup-row td { background: #fff7ed; }

  /* ── Result badges ── */
  .result-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .result-NEGATIVE { background: #dcfce7; color: #15803d; }
  .result-POSITIVE_K9_ALERT { background: #fee2e2; color: #b91c1c; }
  .result-VISUAL_CONFIRMATION { background: #fecaca; color: #991b1b; }
  .result-INCONCLUSIVE { background: #fef9c3; color: #92400e; }
  .result-UNABLE_TO_INSPECT { background: #f1f5f9; color: #64748b; }
  .result-ACCESS_DENIED { background: #f1f5f9; color: #475569; }
  .result-FOLLOW_UP_REQUIRED { background: #ffedd5; color: #c2410c; }

  /* ── Positive findings ── */
  .finding-card { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; }
  .finding-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .finding-unit-num { font-size: 16px; font-weight: 900; color: #b91c1c; }
  .finding-result-label { font-size: 11px; font-weight: 700; color: #dc2626; }
  .finding-meta { font-size: 10px; color: #64748b; }
  .finding-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .finding-detail .info-label { color: #94a3b8; }
  .finding-detail .info-value { color: #1e293b; font-size: 11px; }

  /* ── Flags ── */
  .flag-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 14px; }
  .flag-item { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; font-weight: 600; color: #c2410c; margin-bottom: 4px; }
  .flag-item:last-child { margin-bottom: 0; }

  /* ── Notes ── */
  .notes-box { background: #f8fafc; border-radius: 8px; padding: 12px 14px; font-size: 11px; color: #334155; line-height: 1.7; border: 1px solid #e2e8f0; }

  /* ── Signatures ── */
  .signature-section { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid; }
  .sig-box { border: 1px solid #e2e8f0; border-radius: 8px; min-height: 90px; display: flex; align-items: flex-end; overflow: hidden; }
  .sig-content { padding: 10px 14px; width: 100%; }
  .sig-img { max-width: 100%; max-height: 70px; object-fit: contain; }
  .sig-placeholder { height: 70px; }
  .sig-label { font-size: 9px; color: #94a3b8; margin-top: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .sig-name { font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px; }

  /* ── Disclaimer ── */
  .disclaimer { font-size: 9.5px; color: #94a3b8; padding: 12px 14px; background: #f8fafc; border-radius: 8px; line-height: 1.7; border: 1px solid #e2e8f0; }

  /* ── Photo gallery ── */
  .photo-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .photo-item { border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; break-inside: avoid; }
  .photo-item img { width: 100%; height: 130px; object-fit: cover; display: block; }
  .photo-caption { padding: 5px 8px; font-size: 9px; color: #64748b; background: #f8fafc; }

  @media print {
    .page { padding: 20px; }
    .no-break { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="header">
    <div class="brand-bar">
      <div class="brand-icon">🐾</div>
      <div>
        <div class="company-name">${org.name}</div>
        <div class="company-tagline">K9 Bed Bug Detection & Inspection Services</div>
        <div class="company-meta">
          ${[
            org.addressLine1 ? `${org.addressLine1}${org.city ? `, ${org.city}, ${org.state}` : ""}` : "",
            org.phone ? formatPhone(org.phone) : "",
            org.email ?? "",
            org.licenseNumber ? `License: ${org.licenseNumber}` : "",
          ].filter(Boolean).join("<br>")}
        </div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-badge">Inspection Report</div>
      <div class="report-number">${inspection.inspectionNumber}</div>
      <div class="report-date">${formatDate(inspection.startTime)}</div>
      ${durationMin ? `<div class="report-date" style="margin-top:2px">Duration: ${durationMin} min</div>` : ""}
    </div>
  </div>

  <!-- ── Overall result banner ── -->
  ${inspection.overallResult ? (() => {
    const isPositive = ALERT_RESULTS.has(inspection.overallResult!);
    const isInconclusive = inspection.overallResult === "INCONCLUSIVE" || inspection.overallResult === "FOLLOW_UP_REQUIRED";
    const cls = isPositive ? "positive" : isInconclusive ? "inconclusive" : "negative";
    return `
  <div class="result-banner ${cls}">
    <div>
      <div class="result-banner-label ${cls}">Overall Inspection Result</div>
      <div class="result-banner-value ${cls}">${DETECTION_EMOJI[inspection.overallResult!] ?? ""} ${DETECTION_LABEL[inspection.overallResult!] ?? inspection.overallResult}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#64748b">${inspection.totalUnitsInspected} units inspected</div>
      ${inspection.totalPositive > 0 ? `<div style="font-size:12px;font-weight:700;color:#dc2626">${inspection.totalPositive} positive detection${inspection.totalPositive > 1 ? "s" : ""}</div>` : ""}
    </div>
  </div>`;
  })() : ""}

  <!-- ── Customer & Property ── -->
  <div class="section">
    <div class="section-title">Customer &amp; Property</div>
    <div class="info-grid">
      <div>
        <div class="info-label">Customer</div>
        <div class="info-value">${customer.companyName ?? `${customer.firstName} ${customer.lastName}`}</div>
        ${customer.companyName ? `<div class="info-sub">${customer.firstName} ${customer.lastName}</div>` : ""}
        ${customer.phone ? `<div class="info-sub">${formatPhone(customer.phone)}</div>` : ""}
        ${customer.email ? `<div class="info-sub">${customer.email}</div>` : ""}
      </div>
      <div>
        <div class="info-label">Property</div>
        <div class="info-value">${property.name}</div>
        <div class="info-sub">${property.addressLine1}${property.addressLine2 ? `, ${property.addressLine2}` : ""}</div>
        <div class="info-sub">${property.city}, ${property.state} ${property.zip}</div>
      </div>
    </div>
  </div>

  <!-- ── Inspection Details ── -->
  <div class="section">
    <div class="section-title">Inspection Details</div>
    <div class="info-grid-3">
      <div class="info-block">
        <div class="info-label">Service Type</div>
        <div class="info-value">${inspection.serviceType.replace(/_/g, " ")}</div>
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
      <div class="info-block">
        <div class="info-label">Technician / Handler</div>
        <div class="info-value">${inspection.technician.firstName} ${inspection.technician.lastName}</div>
      </div>
      ${inspection.k9Dog ? `
      <div class="info-block">
        <div class="info-label">K9 Partner</div>
        <div class="info-value">${inspection.k9Dog.name}</div>
        ${inspection.k9Dog.breed ? `<div class="info-sub">${inspection.k9Dog.breed}</div>` : ""}
        ${inspection.k9Dog.certificationNumber ? `<div class="info-sub">Cert: ${inspection.k9Dog.certificationNumber}</div>` : ""}
      </div>` : ""}
      ${inspection.weather ? `
      <div class="info-block">
        <div class="info-label">Weather</div>
        <div class="info-value">${inspection.weather}${inspection.temperature ? ` · ${inspection.temperature}°F` : ""}</div>
      </div>` : ""}
    </div>
  </div>

  <!-- ── Results Summary ── -->
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
      <div class="summary-card followup">
        <div class="summary-num followup">${units.filter((u) => u.followUpRequired).length}</div>
        <div class="summary-label">Follow-Up</div>
      </div>
    </div>
    ${inspection.totalUnitsInspected > 0 ? `
    <div style="height:10px;background:#f1f5f9;border-radius:20px;overflow:hidden">
      <div style="height:100%;background:#dc2626;width:${Math.round((inspection.totalPositive / inspection.totalUnitsInspected) * 100)}%;border-radius:20px;display:inline-block"></div>
      <div style="height:100%;background:#16a34a;width:${Math.round((inspection.totalNegative / inspection.totalUnitsInspected) * 100)}%;border-radius:20px;display:inline-block"></div>
      <div style="height:100%;background:#ca8a04;width:${Math.round((inspection.totalInconclusive / inspection.totalUnitsInspected) * 100)}%;border-radius:20px;display:inline-block"></div>
    </div>
    <div style="font-size:9px;color:#94a3b8;margin-top:4px">
      Detection rate: <strong>${inspection.totalUnitsInspected > 0 ? ((inspection.totalPositive / inspection.totalUnitsInspected) * 100).toFixed(1) : 0}%</strong> of ${inspection.totalUnitsInspected} inspected units
    </div>` : ""}
  </div>

  <!-- ── Positive Findings (detailed cards) ── -->
  ${positiveUnits.length > 0 ? `
  <div class="section">
    <div class="section-title" style="color:#dc2626;border-color:#fca5a5">🚨 Positive Findings — ${positiveUnits.length} Alert${positiveUnits.length > 1 ? "s" : ""}</div>
    ${positiveUnits.map((u) => `
    <div class="finding-card">
      <div class="finding-card-header">
        <div>
          <div class="finding-unit-num">${u.unitNumber}</div>
          ${u.buildingName ? `<div class="finding-meta">Building: ${u.buildingName}${u.floor ? ` · Floor: ${u.floor}` : ""}</div>` : ""}
        </div>
        <div style="margin-left:auto">
          <span class="result-badge result-${u.detectionResult}">
            ${DETECTION_EMOJI[u.detectionResult]} ${DETECTION_LABEL[u.detectionResult] ?? u.detectionResult}
          </span>
          ${u.severityLevel && u.severityLevel !== "NONE" ? `
          <div style="margin-top:4px;font-size:10px;font-weight:700;color:${SEVERITY_COLOR[u.severityLevel]}">Severity: ${SEVERITY_LABEL[u.severityLevel]}</div>` : ""}
        </div>
      </div>
      <div class="finding-detail">
        ${u.alertLocation ? `
        <div class="info-block">
          <div class="info-label">Alert Location</div>
          <div class="info-value">${u.alertLocation}</div>
        </div>` : ""}
        ${u.visualEvidence ? `
        <div class="info-block">
          <div class="info-label">Visual Evidence</div>
          <div class="info-value" style="color:#dc2626">Confirmed</div>
        </div>` : ""}
        ${u.visualNotes ? `
        <div class="info-block" style="grid-column:span 2">
          <div class="info-label">Visual Notes</div>
          <div class="info-value">${u.visualNotes}</div>
        </div>` : ""}
        ${u.technicianNotes ? `
        <div class="info-block" style="grid-column:span 2">
          <div class="info-label">Technician Notes</div>
          <div class="info-value">${u.technicianNotes}</div>
        </div>` : ""}
        ${u.recommendations ? `
        <div class="info-block" style="grid-column:span 2">
          <div class="info-label">Recommendations</div>
          <div class="info-value">${u.recommendations}</div>
        </div>` : ""}
      </div>
      ${u.photos.length > 0 ? `
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:8px">Evidence Photos (${u.photos.length})</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${u.photos.slice(0, 6).map((ph) => `
          <div style="border-radius:6px;overflow:hidden;border:1px solid #fca5a5">
            <img src="${ph.url}" alt="${ph.caption ?? ph.filename}" style="width:100%;height:110px;object-fit:cover;display:block" />
            ${ph.caption ? `<div style="padding:3px 6px;font-size:9px;color:#64748b;background:#fef2f2">${ph.caption}</div>` : ""}
          </div>`).join("")}
        </div>
        ${u.photos.length > 6 ? `<p style="font-size:9px;color:#94a3b8;margin-top:4px">+ ${u.photos.length - 6} more photos</p>` : ""}
      </div>` : ""}
    </div>`).join("")}
  </div>` : ""}

  <!-- ── Inconclusive / Follow-up ── -->
  ${inconclusiveUnits.length > 0 ? `
  <div class="section">
    <div class="section-title" style="color:#ca8a04;border-color:#fde047">⚠️ Requires Attention — ${inconclusiveUnits.length} Unit${inconclusiveUnits.length > 1 ? "s" : ""}</div>
    <table>
      <thead>
        <tr><th>Unit</th><th>Building</th><th>Result</th><th>Notes</th><th>Follow-Up Date</th></tr>
      </thead>
      <tbody>
        ${inconclusiveUnits.map((u) => `
        <tr class="followup-row">
          <td><strong>${u.unitNumber}</strong></td>
          <td>${u.buildingName ?? "—"}</td>
          <td><span class="result-badge result-${u.detectionResult}">${DETECTION_EMOJI[u.detectionResult]} ${DETECTION_LABEL[u.detectionResult] ?? u.detectionResult}</span></td>
          <td>${u.technicianNotes ?? "—"}</td>
          <td>${u.followUpDate ? formatDate(u.followUpDate) : "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- ── Full Unit Matrix ── -->
  ${units.length > 0 ? `
  <div class="section">
    <div class="section-title">Complete Unit Inspection Log (${units.length} units)</div>
    <table>
      <thead>
        <tr>
          <th>Unit #</th>
          <th>Building</th>
          <th>Floor</th>
          <th>Type</th>
          <th>Result</th>
          <th>Alert Location</th>
          <th>Notes</th>
          <th>Photos</th>
        </tr>
      </thead>
      <tbody>
        ${units.map((u) => `
        <tr${ALERT_RESULTS.has(u.detectionResult) ? ' class="alert-row"' : u.detectionResult === "FOLLOW_UP_REQUIRED" || u.detectionResult === "INCONCLUSIVE" ? ' class="followup-row"' : ""}>
          <td><strong>${u.unitNumber}</strong></td>
          <td>${u.buildingName ?? "—"}</td>
          <td>${u.floor ?? "—"}</td>
          <td style="font-size:10px">${u.unitType.replace(/_/g, " ")}</td>
          <td><span class="result-badge result-${u.detectionResult}">${DETECTION_EMOJI[u.detectionResult]} ${DETECTION_LABEL[u.detectionResult] ?? u.detectionResult}</span></td>
          <td style="font-size:10px">${u.alertLocation ?? "—"}</td>
          <td style="font-size:10px">${u.technicianNotes ? u.technicianNotes.substring(0, 80) + (u.technicianNotes.length > 80 ? "…" : "") : "—"}</td>
          <td style="text-align:center;font-size:10px">${u.photos.length > 0 ? `<span style="font-weight:700;color:#3b82f6">${u.photos.length}</span>` : "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- ── Summary Notes ── -->
  ${inspection.summaryNotes ? `
  <div class="section">
    <div class="section-title">Summary of Findings</div>
    <div class="notes-box">${inspection.summaryNotes}</div>
  </div>` : ""}

  ${inspection.recommendations ? `
  <div class="section">
    <div class="section-title">Recommendations</div>
    <div class="notes-box">${inspection.recommendations}</div>
  </div>` : ""}

  <!-- ── Flags ── -->
  ${(inspection.followUpRequired || inspection.treatmentReferral) ? `
  <div class="section">
    <div class="flag-box">
      ${inspection.followUpRequired ? `<div class="flag-item">⚠️ Follow-Up Inspection Required${inspection.followUpDate ? ` · Scheduled: ${formatDate(inspection.followUpDate)}` : ""}</div>` : ""}
      ${inspection.treatmentReferral ? `<div class="flag-item">🔴 Treatment Referral Recommended — Contact pest control immediately</div>` : ""}
    </div>
  </div>` : ""}

  <!-- ── Photo Gallery (all photos) ── -->
  ${allPhotos.length > 0 ? `
  <div class="section">
    <div class="section-title">Photo Documentation (${allPhotos.length} total)</div>
    <div class="photo-gallery">
      ${allPhotos.slice(0, 12).map((ph) => `
      <div class="photo-item">
        <img src="${ph.url}" alt="${ph.caption ?? ph.filename}" />
        ${ph.caption ? `<div class="photo-caption">${ph.caption}</div>` : ""}
      </div>`).join("")}
    </div>
    ${allPhotos.length > 12 ? `<p style="font-size:9px;color:#94a3b8;margin-top:8px">+ ${allPhotos.length - 12} additional photos on file</p>` : ""}
  </div>` : ""}

  <!-- ── Disclaimer ── -->
  <div class="section">
    <div class="disclaimer">
      <strong>Disclaimer:</strong> This report reflects the findings of a K9 scent detection inspection conducted on the date and at the property specified above. K9 detection is a tool used to identify areas of potential bed bug activity and is not a guarantee of infestation or non-infestation. Visual confirmation is recommended to verify K9 alerts. Results are based on conditions observed at the time of inspection. ${org.name} is not responsible for conditions that change after the inspection date. This report is intended for the exclusive use of the named customer and may not be reproduced or distributed without written consent.
    </div>
  </div>

  <!-- ── Signatures ── -->
  <div class="signature-section">
    <div>
      <div class="sig-box">
        <div class="sig-content">
          ${inspection.customerSignature
            ? `<img src="${inspection.customerSignature}" alt="Customer signature" class="sig-img" />`
            : `<div class="sig-placeholder"></div>`}
        </div>
      </div>
      <div class="sig-label">Customer Signature / Acknowledgment</div>
      ${inspection.signedAt ? `<div class="sig-name">Signed: ${formatDateTime(inspection.signedAt)}</div>` : ""}
    </div>
    <div>
      <div class="sig-box">
        <div class="sig-content">
          <div class="sig-placeholder"></div>
        </div>
      </div>
      <div class="sig-label">Technician / K9 Handler</div>
      <div class="sig-name">${inspection.technician.firstName} ${inspection.technician.lastName}</div>
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
