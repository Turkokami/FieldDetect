import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

export interface ReferralUnit {
  id: string;
  unitNumber: string;
  buildingName: string | null;
  floor: string | null;
  unitType: string;
  detectionResult: string;
  severityLevel: string | null;
  alertLocation: string | null;
  visualEvidence: boolean;
  visualNotes: string | null;
  technicianNotes: string | null;
  recommendations: string | null;
}

export interface PestControlReferralPDFProps {
  org: {
    name: string;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl?: string | null;
  };
  property: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zip: string;
  };
  inspection: {
    inspectionNumber: string;
    serviceType: string;
    startTime: Date | null;
    technician: string;
    k9Dog: string | null;
    summaryNotes: string | null;
    recommendations: string | null;
  };
  units: ReferralUnit[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RED = "#dc2626";
const DARK = "#0f172a";
const SLATE = "#64748b";
const LIGHT = "#f1f5f9";
const WHITE = "#ffffff";
const ORANGE = "#c2410c";
const YELLOW = "#ca8a04";

const SEVERITY_COLOR: Record<string, string> = {
  NONE: SLATE,
  LOW: "#16a34a",
  MODERATE: "#d97706",
  HIGH: RED,
  SEVERE: "#7c2d12",
};

const SEVERITY_LABEL: Record<string, string> = {
  NONE: "Low",
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  SEVERE: "Severe — Urgent",
};

const RESULT_LABEL: Record<string, string> = {
  POSITIVE_K9_ALERT: "K9 Alert",
  VISUAL_CONFIRMATION: "Visual Confirmation",
  INCONCLUSIVE: "Inconclusive",
  FOLLOW_UP_REQUIRED: "Follow-Up Required",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, backgroundColor: WHITE, paddingHorizontal: 36, paddingVertical: 32 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: RED },
  brandCol: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: { width: 40, height: 40, backgroundColor: DARK, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  brandIconText: { fontSize: 20, color: WHITE },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK },
  orgMeta: { fontSize: 7.5, color: SLATE, marginTop: 3, lineHeight: 1.5 },
  docBadge: { backgroundColor: RED, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  docBadgeText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: WHITE, letterSpacing: 1 },
  docNum: { fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  docDate: { fontSize: 8, color: SLATE, textAlign: "right", marginTop: 2 },

  noticeBanner: { backgroundColor: "#fef2f2", borderWidth: 1.5, borderColor: "#fca5a5", borderRadius: 8, padding: 10, marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noticeTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: RED, marginBottom: 2 },
  noticeBody: { fontSize: 8, color: "#7f1d1d", lineHeight: 1.5 },

  infoRow: { flexDirection: "row", gap: 14, marginBottom: 14 },
  infoBlock: { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 10 },
  infoLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, color: SLATE, textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  infoSub: { fontSize: 8, color: SLATE, marginTop: 1 },

  summaryBox: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5", borderRadius: 8, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 20 },
  summaryCount: { fontSize: 32, fontFamily: "Helvetica-Bold", color: RED, lineHeight: 1 },
  summaryLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: RED, letterSpacing: 0.5, textTransform: "uppercase" },
  summarySub: { fontSize: 7.5, color: SLATE, marginTop: 2 },

  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: SLATE, textTransform: "uppercase", paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", marginBottom: 8 },

  tableHeader: { flexDirection: "row", backgroundColor: "#fef2f2", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1.5, borderBottomColor: "#fca5a5" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9", backgroundColor: "#fefafa" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, color: RED, textTransform: "uppercase" },
  td: { fontSize: 8, color: DARK },

  unitChip: { backgroundColor: "#fee2e2", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  unitChipText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: RED },

  severityChip: { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1.5 },

  instructionsBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac", borderRadius: 8, padding: 12, marginTop: 14 },
  instructionsTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#15803d", marginBottom: 4 },
  instructionItem: { fontSize: 8, color: "#166534", lineHeight: 1.6, marginBottom: 2 },

  notesBox: { backgroundColor: LIGHT, borderRadius: 6, padding: 10, fontSize: 8.5, color: "#334155", lineHeight: 1.6, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },

  footer: { borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 8, marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 7, color: SLATE },
  footerBold: { fontSize: 7, fontFamily: "Helvetica-Bold", color: DARK },
});

// ── Main PDF ──────────────────────────────────────────────────────────────────

export function PestControlReferralPDF({ org, property, inspection, units }: PestControlReferralPDFProps) {
  const urgentUnits = units.filter((u) =>
    u.severityLevel === "HIGH" || u.severityLevel === "SEVERE"
  );

  const orgMeta = [
    org.addressLine1 ? `${org.addressLine1}${org.city ? `, ${org.city}, ${org.state}` : ""}` : null,
    org.phone ?? null,
    org.email ?? null,
    org.website ?? null,
  ].filter(Boolean) as string[];

  return (
    <Document title={`Pest Control Referral — ${property.name}`} author={org.name} creator="FieldDetect">
      <Page size="LETTER" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.brandCol}>
            {org.logoUrl ? (
              <Image src={org.logoUrl} style={{ width: 40, height: 40, borderRadius: 8 }} />
            ) : (
              <View style={s.brandIcon}>
                <Text style={s.brandIconText}>🐾</Text>
              </View>
            )}
            <View>
              <Text style={s.orgName}>{org.name}</Text>
              {orgMeta.map((line, i) => (
                <Text key={i} style={s.orgMeta}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={s.docBadge}>
              <Text style={s.docBadgeText}>PEST CONTROL TREATMENT REFERRAL</Text>
            </View>
            <Text style={s.docNum}>Ref: {inspection.inspectionNumber}</Text>
            <Text style={s.docDate}>Issued: {fmtDate(inspection.startTime)}</Text>
          </View>
        </View>

        {/* ── Notice ── */}
        <View style={s.noticeBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.noticeTitle}>Treatment Required</Text>
            <Text style={s.noticeBody}>
              This document is a formal referral issued following a K9 scent detection inspection of the property listed below.
              The units identified in this referral require professional pest control treatment.
              Please contact {org.name} at {org.phone ?? org.email ?? "the number above"} with any questions regarding these findings.
            </Text>
          </View>
        </View>

        {/* ── Property + Inspection Info ── */}
        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Property Requiring Treatment</Text>
            <Text style={s.infoValue}>{property.name}</Text>
            <Text style={s.infoSub}>{property.addressLine1}{property.addressLine2 ? `, ${property.addressLine2}` : ""}</Text>
            <Text style={s.infoSub}>{property.city}, {property.state} {property.zip}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Inspection Reference</Text>
            <Text style={s.infoValue}>#{inspection.inspectionNumber}</Text>
            <Text style={s.infoSub}>Date: {fmtDate(inspection.startTime)}</Text>
            <Text style={s.infoSub}>Service: {inspection.serviceType.replace(/_/g, " ")}</Text>
            <Text style={s.infoSub}>Handler: {inspection.technician}</Text>
            {inspection.k9Dog && <Text style={s.infoSub}>K9: {inspection.k9Dog}</Text>}
          </View>
        </View>

        {/* ── Summary ── */}
        <View style={s.summaryBox}>
          <View style={{ alignItems: "center", width: 60 }}>
            <Text style={s.summaryCount}>{units.length}</Text>
            <Text style={s.summaryLabel}>Unit{units.length !== 1 ? "s" : ""}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: RED, marginBottom: 3 }}>
              Flagged for Pest Control Treatment
            </Text>
            <Text style={s.summarySub}>
              {urgentUnits.length > 0
                ? `${urgentUnits.length} unit${urgentUnits.length > 1 ? "s" : ""} flagged HIGH/SEVERE severity — prioritize immediately.`
                : "All flagged units require treatment. Schedule at earliest availability."}
            </Text>
          </View>
        </View>

        {/* ── Unit Treatment Table ── */}
        <Text style={[s.sectionTitle, { color: RED, borderBottomColor: "#fca5a5", marginBottom: 6 }]}>
          Units Requiring Treatment
        </Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, { flex: 1.2 }]}>Unit #</Text>
          <Text style={[s.th, { flex: 1.4 }]}>Building</Text>
          <Text style={[s.th, { flex: 0.7 }]}>Floor</Text>
          <Text style={[s.th, { flex: 1.5 }]}>Finding</Text>
          <Text style={[s.th, { flex: 1.2 }]}>Severity</Text>
          <Text style={[s.th, { flex: 2 }]}>Alert Location</Text>
          <Text style={[s.th, { flex: 2.5 }]}>Treatment Notes</Text>
        </View>
        {units.map((u, idx) => {
          const sev = u.severityLevel ?? "NONE";
          const sevColor = SEVERITY_COLOR[sev] ?? SLATE;
          return (
            <View key={u.id} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
              <View style={[{ flex: 1.2 }]}>
                <View style={s.unitChip}>
                  <Text style={s.unitChipText}>{u.unitNumber}</Text>
                </View>
              </View>
              <Text style={[s.td, { flex: 1.4 }]}>{u.buildingName ?? "—"}</Text>
              <Text style={[s.td, { flex: 0.7 }]}>{u.floor ?? "—"}</Text>
              <Text style={[s.td, { flex: 1.5, fontSize: 7.5 }]}>
                {RESULT_LABEL[u.detectionResult] ?? u.detectionResult.replace(/_/g, " ")}
                {u.visualEvidence ? "\n✓ Visual confirmed" : ""}
              </Text>
              <View style={[{ flex: 1.2, justifyContent: "center" }]}>
                <View style={[s.severityChip, { backgroundColor: `${sevColor}18`, alignSelf: "flex-start" }]}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: sevColor }}>
                    {SEVERITY_LABEL[sev] ?? sev}
                  </Text>
                </View>
              </View>
              <Text style={[s.td, { flex: 2 }]}>{u.alertLocation ?? "—"}</Text>
              <Text style={[s.td, { flex: 2.5, fontSize: 7.5 }]}>
                {[u.visualNotes, u.technicianNotes, u.recommendations]
                  .filter(Boolean)
                  .join(" · ")
                  .substring(0, 120) || "—"}
              </Text>
            </View>
          );
        })}

        {/* ── Inspector Notes ── */}
        {(inspection.summaryNotes || inspection.recommendations) && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sectionTitle}>Inspector Notes &amp; Recommendations</Text>
            {inspection.summaryNotes && (
              <View style={s.notesBox}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: SLATE, marginBottom: 3 }}>SUMMARY</Text>
                <Text>{inspection.summaryNotes}</Text>
              </View>
            )}
            {inspection.recommendations && (
              <View style={s.notesBox}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: SLATE, marginBottom: 3 }}>RECOMMENDATIONS</Text>
                <Text>{inspection.recommendations}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Instructions for Pest Control ── */}
        <View style={s.instructionsBox}>
          <Text style={s.instructionsTitle}>Instructions for Pest Control Provider</Text>
          <Text style={s.instructionItem}>1. Treat all units listed in the table above for bed bug infestation.</Text>
          <Text style={s.instructionItem}>2. Pay close attention to the "Alert Location" column — this indicates the specific area within each unit where K9 detection occurred.</Text>
          <Text style={s.instructionItem}>3. Units marked HIGH or SEVERE severity should be prioritized and may require more intensive treatment protocols.</Text>
          <Text style={s.instructionItem}>4. Upon treatment completion, provide a treatment report to the property manager and a copy to {org.name} for follow-up inspection scheduling.</Text>
          <Text style={s.instructionItem}>5. Contact {org.name} to schedule a post-treatment clearance inspection once all units have been treated and adequate time has elapsed.</Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerBold}>{org.name}</Text>
            <Text style={s.footerText}>Inspection #{inspection.inspectionNumber} · {fmtDate(inspection.startTime)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.footerText}>This referral was generated by FieldDetect inspection software.</Text>
            <Text style={s.footerText}>For the complete inspection report contact {org.name}.</Text>
          </View>
        </View>

        <Text
          fixed
          style={{ position: "absolute", bottom: 20, right: 36, fontSize: 7, color: SLATE }}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
