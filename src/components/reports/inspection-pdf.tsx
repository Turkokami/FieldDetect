import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface InspectionUnit {
  id: string;
  unitNumber: string;
  buildingName: string | null;
  floor: string | null;
  unitType: string;
  detectionResult: string;
  alertLocation: string | null;
  severityLevel: string | null;
  visualEvidence: boolean;
  visualNotes: string | null;
  technicianNotes: string | null;
  recommendations: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  photos: { url: string; filename: string; caption: string | null }[];
}

export interface InspectionPDFProps {
  org: {
    name: string;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    licenseNumber: string | null;
    logoUrl?: string | null;
  };
  customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
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
    overallResult: string | null;
    totalUnitsInspected: number;
    totalPositive: number;
    totalNegative: number;
    totalInconclusive: number;
    totalInaccessible: number;
    startTime: Date | null;
    endTime: Date | null;
    weather: string | null;
    temperature: number | null;
    summaryNotes: string | null;
    recommendations: string | null;
    followUpRequired: boolean;
    followUpDate: Date | null;
    treatmentReferral: boolean;
    customerSignature: string | null;
    signedAt: Date | null;
  };
  technician: { firstName: string; lastName: string };
  k9Dog: { name: string; breed: string | null; certificationNumber: string | null } | null;
  units: InspectionUnit[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAL = "#0ABAB5";
const DARK = "#0f172a";
const SLATE = "#64748b";
const LIGHT = "#f1f5f9";
const WHITE = "#ffffff";
const RED = "#dc2626";
const GREEN = "#16a34a";
const YELLOW = "#ca8a04";

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
  NEGATIVE: "✓",
  POSITIVE_K9_ALERT: "!",
  VISUAL_CONFIRMATION: "!",
  INCONCLUSIVE: "?",
  UNABLE_TO_INSPECT: "×",
  ACCESS_DENIED: "×",
  FOLLOW_UP_REQUIRED: "↻",
};

const ALERT_RESULTS = new Set(["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, backgroundColor: WHITE, paddingHorizontal: 36, paddingVertical: 36 },

  // header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: DARK },
  brandCol: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  brandIcon: { width: 44, height: 44, backgroundColor: DARK, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  brandIconText: { fontSize: 22, color: WHITE },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: DARK },
  companyTagline: { fontSize: 8, color: SLATE, marginTop: 2 },
  companyMeta: { fontSize: 7.5, color: SLATE, marginTop: 4, lineHeight: 1.5 },
  reportCol: { alignItems: "flex-end" },
  reportBadge: { backgroundColor: LIGHT, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: "#475569", marginBottom: 4 },
  reportNum: { fontSize: 18, fontFamily: "Helvetica-Bold", color: DARK },
  reportDate: { fontSize: 8, color: SLATE, marginTop: 2 },

  // result banner
  banner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 8, padding: 12, marginBottom: 18 },
  bannerLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 3 },
  bannerValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  bannerRight: { alignItems: "flex-end" },

  // section
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, color: SLATE, textTransform: "uppercase", paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", marginBottom: 8 },

  // info grid
  infoGrid: { flexDirection: "row", gap: 16 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 7, color: "#94a3b8", fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK },
  infoSub: { fontSize: 8, color: SLATE, marginTop: 1 },

  // summary cards
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 8, padding: 10, alignItems: "center", borderWidth: 1 },
  summaryNum: { fontSize: 24, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  summaryLabel: { fontSize: 7, color: SLATE, marginTop: 4, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },

  // table
  tableHeader: { flexDirection: "row", backgroundColor: LIGHT, paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#f1f5f9" },
  tableRowAlert: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#fca5a5", backgroundColor: "#fef2f2" },
  tableRowFollowup: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#fde68a", backgroundColor: "#fefce8" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, color: "#475569", textTransform: "uppercase" },
  td: { fontSize: 8, color: DARK },

  // result badge inline
  badgeText: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  // finding card
  findingCard: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5", borderRadius: 8, padding: 12, marginBottom: 10 },
  findingUnitNum: { fontSize: 14, fontFamily: "Helvetica-Bold", color: RED },

  // notes
  notesBox: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 10, fontSize: 8.5, color: "#334155", lineHeight: 1.6 },

  // flag box
  flagBox: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", borderRadius: 6, padding: 10 },
  flagText: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#c2410c", marginBottom: 3 },

  // disclaimer
  disclaimer: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 10, fontSize: 7.5, color: "#94a3b8", lineHeight: 1.6, marginTop: 10 },

  // signature
  sigRow: { flexDirection: "row", gap: 24, marginTop: 20 },
  sigBox: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, minHeight: 70, padding: 8 },
  sigLabel: { fontSize: 7, color: "#94a3b8", fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 4 },
  sigName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#475569", marginTop: 2 },

  // photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoItem: { width: "31%", borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" },
  photoImg: { width: "100%", height: 90 },
  photoCaption: { fontSize: 7, color: SLATE, padding: 3, backgroundColor: "#f8fafc" },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  const isAlert = ALERT_RESULTS.has(result);
  const isInconclusive = result === "INCONCLUSIVE" || result === "FOLLOW_UP_REQUIRED";
  const bg = isAlert ? "#fee2e2" : isInconclusive ? "#fef9c3" : result === "NEGATIVE" ? "#dcfce7" : "#f1f5f9";
  const color = isAlert ? RED : isInconclusive ? YELLOW : result === "NEGATIVE" ? GREEN : SLATE;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={[s.badgeText, { color }]}>
        {DETECTION_EMOJI[result] ?? "·"} {DETECTION_LABEL[result] ?? result.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

// ── Main PDF Component ────────────────────────────────────────────────────────

export function InspectionPDF({ org, customer, property, inspection, technician, k9Dog, units }: InspectionPDFProps) {
  const positiveUnits = units.filter((u) => ALERT_RESULTS.has(u.detectionResult));
  const inconclusiveUnits = units.filter((u) => u.detectionResult === "INCONCLUSIVE" || u.detectionResult === "FOLLOW_UP_REQUIRED");
  const allPhotos = units.flatMap((u) => u.photos);
  const followUpUnits = units.filter((u) => u.followUpRequired);

  const isOverallPositive = inspection.overallResult ? ALERT_RESULTS.has(inspection.overallResult) : false;
  const isOverallInconclusive = inspection.overallResult === "INCONCLUSIVE" || inspection.overallResult === "FOLLOW_UP_REQUIRED";
  const bannerBg = isOverallPositive ? "#fef2f2" : isOverallInconclusive ? "#fefce8" : "#f0fdf4";
  const bannerBorder = isOverallPositive ? "#fca5a5" : isOverallInconclusive ? "#fde047" : "#86efac";
  const bannerColor = isOverallPositive ? RED : isOverallInconclusive ? YELLOW : GREEN;

  const durationMs = inspection.endTime && inspection.startTime
    ? new Date(inspection.endTime).getTime() - new Date(inspection.startTime).getTime()
    : null;
  const durationMin = durationMs ? Math.round(durationMs / 60000) : null;

  const orgMetaLines = [
    org.addressLine1 ? `${org.addressLine1}${org.city ? `, ${org.city}, ${org.state}` : ""}` : null,
    fmtPhone(org.phone) || null,
    org.email || null,
    org.licenseNumber ? `License: ${org.licenseNumber}` : null,
  ].filter(Boolean) as string[];

  const SERVICE_TAGLINE: Record<string, string> = {
    BED_BUG_INSPECTION:    "K9 Bed Bug Detection & Inspection Services",
    BED_BUG_TREATMENT:     "Bed Bug Treatment Services",
    RODENT_INSPECTION:     "Rodent Inspection & Detection Services",
    RODENT_EXCLUSION:      "Rodent Exclusion Services",
    WILDLIFE_INSPECTION:   "Wildlife Inspection Services",
    WILDLIFE_REMOVAL:      "Wildlife Removal & Control Services",
    BIRD_EXCLUSION:        "Bird Exclusion Services",
    GOOSE_CONTROL:         "Canada Goose Control & Management",
    GENERAL_PEST_INSPECTION: "General Pest Inspection Services",
    GENERAL_PEST_TREATMENT:  "Pest Control & Treatment Services",
  };
  const SERVICE_DISCLAIMER: Record<string, string> = {
    BED_BUG_INSPECTION:    "This report reflects the findings of a K9 scent detection inspection. K9 detection is a tool used to identify areas of potential bed bug activity and is not a guarantee of infestation or non-infestation. Visual confirmation is recommended to verify K9 alerts.",
    BED_BUG_TREATMENT:     "This report reflects bed bug treatment services performed on the date and property specified. Results may vary based on infestation level and preparation compliance.",
    RODENT_INSPECTION:     "This report reflects the findings of a rodent inspection performed on the date and property specified above. Findings are based on conditions observed at the time of inspection.",
    RODENT_EXCLUSION:      "This report reflects rodent exclusion work performed on the date and property specified above. Exclusion effectiveness depends on conditions and customer maintenance of entry point repairs.",
    WILDLIFE_INSPECTION:   "This report reflects the findings of a wildlife inspection. Findings are based on conditions observed at the time of inspection and may not capture all wildlife activity on the property.",
    WILDLIFE_REMOVAL:      "This report reflects wildlife removal services performed on the date and property specified. Wildlife activity may resume if exclusion measures are not implemented.",
    BIRD_EXCLUSION:        "This report reflects bird exclusion work performed on the date and property specified. Exclusion effectiveness depends on installation conditions and ongoing maintenance.",
    GOOSE_CONTROL:         "This report reflects Canada Goose control and management services. Effectiveness depends on site conditions, seasonal patterns, and follow-up treatment as recommended.",
    GENERAL_PEST_INSPECTION: "This report reflects the findings of a pest inspection. Findings are based on conditions observed at the time of inspection.",
    GENERAL_PEST_TREATMENT:  "This report reflects pest control treatment services performed on the date and property specified. Results may vary based on infestation level and preparation compliance.",
  };
  const tagline = SERVICE_TAGLINE[inspection.serviceType] ?? "Pest Control & Inspection Services";
  const disclaimer = SERVICE_DISCLAIMER[inspection.serviceType]
    ?? "This report reflects the findings of an inspection conducted on the date and at the property specified above. Results are based on conditions observed at the time of inspection.";
  const sigLabel = ["BED_BUG_INSPECTION", "BED_BUG_TREATMENT"].includes(inspection.serviceType)
    ? "Technician / K9 Handler"
    : "Technician";

  return (
    <Document title={`Inspection Report — ${inspection.inspectionNumber}`} author={org.name} creator="FieldDetect">
      {/* ── Page 1: Header + Summary + Positive Findings ── */}
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.brandCol}>
            {org.logoUrl ? (
              <Image src={org.logoUrl} style={{ width: 44, height: 44, borderRadius: 8 }} />
            ) : (
              <View style={s.brandIcon}>
                <Text style={s.brandIconText}>🐾</Text>
              </View>
            )}
            <View>
              <Text style={s.companyName}>{org.name}</Text>
              <Text style={s.companyTagline}>{tagline}</Text>
              {orgMetaLines.map((line, i) => (
                <Text key={i} style={s.companyMeta}>{line}</Text>
              ))}
            </View>
          </View>
          <View style={s.reportCol}>
            <View style={s.reportBadge}>
              <Text>INSPECTION REPORT</Text>
            </View>
            <Text style={s.reportNum}>{inspection.inspectionNumber}</Text>
            <Text style={s.reportDate}>{fmtDate(inspection.startTime)}</Text>
            {durationMin && <Text style={[s.reportDate, { marginTop: 1 }]}>Duration: {durationMin} min</Text>}
          </View>
        </View>

        {/* Overall result banner */}
        {inspection.overallResult && (
          <View style={[s.banner, { backgroundColor: bannerBg, borderWidth: 1.5, borderColor: bannerBorder }]}>
            <View>
              <Text style={[s.bannerLabel, { color: bannerColor }]}>Overall Inspection Result</Text>
              <Text style={[s.bannerValue, { color: bannerColor }]}>
                {DETECTION_EMOJI[inspection.overallResult] ?? ""} {DETECTION_LABEL[inspection.overallResult] ?? inspection.overallResult.replace(/_/g, " ")}
              </Text>
            </View>
            <View style={s.bannerRight}>
              <Text style={{ fontSize: 8, color: SLATE }}>{inspection.totalUnitsInspected} units inspected</Text>
              {inspection.totalPositive > 0 && (
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: RED, marginTop: 2 }}>
                  {inspection.totalPositive} positive detection{inspection.totalPositive > 1 ? "s" : ""}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Customer & Property */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Customer & Property</Text>
          <View style={s.infoGrid}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Customer</Text>
              <Text style={s.infoValue}>
                {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
              </Text>
              {customer.companyName && (
                <Text style={s.infoSub}>{customer.firstName} {customer.lastName}</Text>
              )}
              {customer.phone && <Text style={s.infoSub}>{fmtPhone(customer.phone)}</Text>}
              {customer.email && <Text style={s.infoSub}>{customer.email}</Text>}
            </View>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Property</Text>
              <Text style={s.infoValue}>{property.name}</Text>
              <Text style={s.infoSub}>{property.addressLine1}{property.addressLine2 ? `, ${property.addressLine2}` : ""}</Text>
              <Text style={s.infoSub}>{property.city}, {property.state} {property.zip}</Text>
            </View>
          </View>
        </View>

        {/* Inspection details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Inspection Details</Text>
          <View style={[s.infoGrid, { flexWrap: "wrap" }]}>
            <View style={[s.infoBlock, { minWidth: "30%" }]}>
              <Text style={s.infoLabel}>Service Type</Text>
              <Text style={s.infoValue}>{inspection.serviceType.replace(/_/g, " ")}</Text>
            </View>
            <View style={[s.infoBlock, { minWidth: "30%" }]}>
              <Text style={s.infoLabel}>Date</Text>
              <Text style={s.infoValue}>{fmtDate(inspection.startTime)}</Text>
            </View>
            <View style={[s.infoBlock, { minWidth: "30%" }]}>
              <Text style={s.infoLabel}>Time</Text>
              <Text style={s.infoValue}>
                {fmtTime(inspection.startTime)}{inspection.endTime ? ` – ${fmtTime(inspection.endTime)}` : ""}
              </Text>
            </View>
            <View style={[s.infoBlock, { minWidth: "30%", marginTop: 10 }]}>
              <Text style={s.infoLabel}>Technician / Handler</Text>
              <Text style={s.infoValue}>{technician.firstName} {technician.lastName}</Text>
            </View>
            {k9Dog && (
              <View style={[s.infoBlock, { minWidth: "30%", marginTop: 10 }]}>
                <Text style={s.infoLabel}>K9 Partner</Text>
                <Text style={s.infoValue}>{k9Dog.name}</Text>
                {k9Dog.breed && <Text style={s.infoSub}>{k9Dog.breed}</Text>}
                {k9Dog.certificationNumber && <Text style={s.infoSub}>Cert: {k9Dog.certificationNumber}</Text>}
              </View>
            )}
            {inspection.weather && (
              <View style={[s.infoBlock, { minWidth: "30%", marginTop: 10 }]}>
                <Text style={s.infoLabel}>Weather</Text>
                <Text style={s.infoValue}>{inspection.weather}{inspection.temperature ? ` · ${inspection.temperature}°F` : ""}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Results summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Results Summary</Text>
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
              <Text style={[s.summaryNum, { color: GREEN }]}>{inspection.totalNegative}</Text>
              <Text style={s.summaryLabel}>Negative</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
              <Text style={[s.summaryNum, { color: RED }]}>{inspection.totalPositive}</Text>
              <Text style={s.summaryLabel}>Positive</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: "#fefce8", borderColor: "#fde047" }]}>
              <Text style={[s.summaryNum, { color: YELLOW }]}>{inspection.totalInconclusive}</Text>
              <Text style={s.summaryLabel}>Inconclusive</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }]}>
              <Text style={[s.summaryNum, { color: SLATE }]}>{inspection.totalInaccessible}</Text>
              <Text style={s.summaryLabel}>Inaccessible</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: "#fff7ed", borderColor: "#fdba74" }]}>
              <Text style={[s.summaryNum, { color: "#ea580c" }]}>{followUpUnits.length}</Text>
              <Text style={s.summaryLabel}>Follow-Up</Text>
            </View>
          </View>
          {inspection.totalUnitsInspected > 0 && (
            <Text style={{ fontSize: 8, color: SLATE }}>
              Detection rate: {((inspection.totalPositive / inspection.totalUnitsInspected) * 100).toFixed(1)}% of {inspection.totalUnitsInspected} inspected units
            </Text>
          )}
        </View>

        {/* Positive findings */}
        {positiveUnits.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: RED, borderBottomColor: "#fca5a5" }]}>
              ! Positive Findings — {positiveUnits.length} Alert{positiveUnits.length > 1 ? "s" : ""}
            </Text>
            {positiveUnits.map((u) => (
              <View key={u.id} style={s.findingCard} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <View>
                    <Text style={s.findingUnitNum}>{u.unitNumber}</Text>
                    {u.buildingName && (
                      <Text style={{ fontSize: 8, color: SLATE }}>
                        Building: {u.buildingName}{u.floor ? ` · Floor: ${u.floor}` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ResultBadge result={u.detectionResult} />
                    {u.severityLevel && u.severityLevel !== "NONE" && (
                      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: RED, marginTop: 3 }}>
                        Severity: {u.severityLevel}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {u.alertLocation && (
                    <View style={{ minWidth: "40%" }}>
                      <Text style={s.infoLabel}>Alert Location</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.alertLocation}</Text>
                    </View>
                  )}
                  {u.visualEvidence && (
                    <View style={{ minWidth: "40%" }}>
                      <Text style={s.infoLabel}>Visual Evidence</Text>
                      <Text style={{ fontSize: 9, color: RED, fontFamily: "Helvetica-Bold" }}>Confirmed</Text>
                    </View>
                  )}
                  {u.visualNotes && (
                    <View style={{ width: "100%" }}>
                      <Text style={s.infoLabel}>Visual Notes</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.visualNotes}</Text>
                    </View>
                  )}
                  {u.technicianNotes && (
                    <View style={{ width: "100%" }}>
                      <Text style={s.infoLabel}>Technician Notes</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.technicianNotes}</Text>
                    </View>
                  )}
                  {u.recommendations && (
                    <View style={{ width: "100%" }}>
                      <Text style={s.infoLabel}>Recommendations</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.recommendations}</Text>
                    </View>
                  )}
                </View>
                {u.photos.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[s.infoLabel, { marginBottom: 5 }]}>Evidence Photos ({u.photos.length})</Text>
                    <View style={s.photoGrid}>
                      {u.photos.slice(0, 6).map((ph, pi) => (
                        <View key={pi} style={[s.photoItem, { borderColor: "#fca5a5" }]}>
                          <Image src={ph.url} style={[s.photoImg, { objectFit: "cover" }]} />
                          {ph.caption && <Text style={s.photoCaption}>{ph.caption}</Text>}
                        </View>
                      ))}
                    </View>
                    {u.photos.length > 6 && (
                      <Text style={{ fontSize: 7.5, color: SLATE, marginTop: 3 }}>+ {u.photos.length - 6} more photos on file</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Inconclusive / follow-up */}
        {inconclusiveUnits.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: YELLOW, borderBottomColor: "#fde047" }]}>
              Requires Attention — {inconclusiveUnits.length} Unit{inconclusiveUnits.length > 1 ? "s" : ""}
            </Text>
            {inconclusiveUnits.map((u) => (
              <View key={u.id} style={{ backgroundColor: "#fefce8", borderWidth: 1, borderColor: "#fde047", borderRadius: 8, padding: 10, marginBottom: 8 }} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: YELLOW }}>{u.unitNumber}</Text>
                    {u.buildingName && (
                      <Text style={{ fontSize: 8, color: SLATE }}>
                        Building: {u.buildingName}{u.floor ? ` · Floor: ${u.floor}` : ""}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ResultBadge result={u.detectionResult} />
                    {u.followUpDate && (
                      <Text style={{ fontSize: 8, color: YELLOW, marginTop: 3 }}>
                        Follow-Up: {fmtDate(u.followUpDate)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {u.technicianNotes && (
                    <View style={{ width: "100%" }}>
                      <Text style={s.infoLabel}>Technician Notes</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.technicianNotes}</Text>
                    </View>
                  )}
                  {u.recommendations && (
                    <View style={{ width: "100%" }}>
                      <Text style={s.infoLabel}>Recommendations</Text>
                      <Text style={{ fontSize: 9, color: DARK }}>{u.recommendations}</Text>
                    </View>
                  )}
                </View>
                {u.photos.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[s.infoLabel, { marginBottom: 5 }]}>Photos ({u.photos.length})</Text>
                    <View style={s.photoGrid}>
                      {u.photos.slice(0, 6).map((ph, pi) => (
                        <View key={pi} style={[s.photoItem, { borderColor: "#fde047" }]}>
                          <Image src={ph.url} style={[s.photoImg, { objectFit: "cover" }]} />
                          {ph.caption && <Text style={s.photoCaption}>{ph.caption}</Text>}
                        </View>
                      ))}
                    </View>
                    {u.photos.length > 6 && (
                      <Text style={{ fontSize: 7.5, color: SLATE, marginTop: 3 }}>+ {u.photos.length - 6} more photos on file</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Page number */}
        <Text
          fixed
          style={{ position: "absolute", bottom: 20, right: 36, fontSize: 7.5, color: SLATE }}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>

      {/* ── Page 2: Full unit log + notes + signatures ── */}
      <Page size="LETTER" style={s.page}>

        {/* Re-print company + report number in top-right as a small header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" }} fixed>
          <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: DARK }}>{org.name}</Text>
          <Text style={{ fontSize: 8.5, color: SLATE }}>Report {inspection.inspectionNumber}</Text>
        </View>

        {/* Full unit matrix */}
        {units.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Complete Unit Inspection Log ({units.length} units)</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1.2 }]}>Unit #</Text>
              <Text style={[s.th, { flex: 1.5 }]}>Building</Text>
              <Text style={[s.th, { flex: 0.8 }]}>Floor</Text>
              <Text style={[s.th, { flex: 1.5 }]}>Type</Text>
              <Text style={[s.th, { flex: 2.5 }]}>Result</Text>
              <Text style={[s.th, { flex: 2 }]}>Alert Location</Text>
              <Text style={[s.th, { flex: 3 }]}>Notes</Text>
            </View>
            {units.map((u) => {
              const isAlert = ALERT_RESULTS.has(u.detectionResult);
              const isFollowup = u.detectionResult === "FOLLOW_UP_REQUIRED" || u.detectionResult === "INCONCLUSIVE";
              const rowStyle = isAlert ? s.tableRowAlert : isFollowup ? s.tableRowFollowup : s.tableRow;
              return (
                <View key={u.id} style={rowStyle} wrap={false}>
                  <Text style={[s.td, { flex: 1.2, fontFamily: "Helvetica-Bold" }]}>{u.unitNumber}</Text>
                  <Text style={[s.td, { flex: 1.5 }]}>{u.buildingName ?? "—"}</Text>
                  <Text style={[s.td, { flex: 0.8 }]}>{u.floor ?? "—"}</Text>
                  <Text style={[s.td, { flex: 1.5, fontSize: 7.5 }]}>{u.unitType.replace(/_/g, " ")}</Text>
                  <View style={{ flex: 2.5, paddingVertical: 2 }}>
                    <ResultBadge result={u.detectionResult} />
                  </View>
                  <Text style={[s.td, { flex: 2 }]}>{u.alertLocation ?? "—"}</Text>
                  <Text style={[s.td, { flex: 3, fontSize: 7.5 }]}>
                    {u.technicianNotes ? u.technicianNotes.substring(0, 100) + (u.technicianNotes.length > 100 ? "…" : "") : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Summary notes */}
        {inspection.summaryNotes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Summary of Findings</Text>
            <View style={s.notesBox}>
              <Text>{inspection.summaryNotes}</Text>
            </View>
          </View>
        )}

        {inspection.recommendations && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recommendations</Text>
            <View style={s.notesBox}>
              <Text>{inspection.recommendations}</Text>
            </View>
          </View>
        )}

        {/* Flags */}
        {(inspection.followUpRequired || inspection.treatmentReferral) && (
          <View style={[s.section, { marginBottom: 14 }]}>
            <View style={s.flagBox}>
              {inspection.followUpRequired && (
                <Text style={s.flagText}>
                  Follow-Up Inspection Required{inspection.followUpDate ? ` · Scheduled: ${fmtDate(inspection.followUpDate)}` : ""}
                </Text>
              )}
              {inspection.treatmentReferral && (
                <Text style={[s.flagText, { marginBottom: 0 }]}>
                  Treatment Referral Recommended — Contact pest control immediately
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Photo gallery */}
        {allPhotos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Photo Documentation ({allPhotos.length} total)</Text>
            <View style={s.photoGrid}>
              {allPhotos.slice(0, 12).map((ph, i) => (
                <View key={i} style={s.photoItem}>
                  <Image src={ph.url} style={[s.photoImg, { objectFit: "cover" }]} />
                  {ph.caption && <Text style={s.photoCaption}>{ph.caption}</Text>}
                </View>
              ))}
            </View>
            {allPhotos.length > 12 && (
              <Text style={{ fontSize: 7.5, color: SLATE, marginTop: 5 }}>
                + {allPhotos.length - 12} additional photos on file
              </Text>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Disclaimer</Text>
          <Text>
            {disclaimer}
            {" "}{org.name} is not responsible for conditions that change after the inspection date.
            This report is intended for the exclusive use of the named customer and may not be reproduced or distributed without written consent.
          </Text>
        </View>

        {/* Signatures */}
        <View style={s.sigRow}>
          <View style={{ flex: 1 }}>
            <View style={s.sigBox}>
              {inspection.customerSignature ? (
                <Image src={inspection.customerSignature} style={{ maxWidth: "100%", maxHeight: 60, objectFit: "contain" }} />
              ) : (
                <View style={{ height: 60 }} />
              )}
            </View>
            <Text style={s.sigLabel}>Customer Signature / Acknowledgment</Text>
            {inspection.signedAt && (
              <Text style={[s.sigName, { color: SLATE }]}>Signed: {fmtDate(inspection.signedAt)}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.sigBox}>
              <View style={{ height: 60 }} />
            </View>
            <Text style={s.sigLabel}>{sigLabel}</Text>
            <Text style={s.sigName}>{technician.firstName} {technician.lastName}</Text>
          </View>
        </View>

        {/* Page number */}
        <Text
          fixed
          style={{ position: "absolute", bottom: 20, right: 36, fontSize: 7.5, color: SLATE }}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
