import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contract-template";

const DARK = "#0f172a";
const SLATE = "#64748b";
const LIGHT = "#f1f5f9";
const WHITE = "#ffffff";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    backgroundColor: WHITE,
    paddingHorizontal: 42,
    paddingVertical: 42,
  },
  // header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: DARK,
  },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: DARK },
  companyMeta: { fontSize: 7.5, color: SLATE, marginTop: 3, lineHeight: 1.6 },
  badge: {
    backgroundColor: LIGHT,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    color: "#475569",
  },
  // customer info box
  infoBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#f8fafc",
  },
  infoBoxTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: SLATE,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  infoRow: { flexDirection: "row", marginBottom: 5, gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 7, color: SLATE, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  infoValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK, marginTop: 1 },
  infoValueMuted: { fontSize: 9, color: "#334155", marginTop: 1 },
  // body
  sectionHeader: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    letterSpacing: 0.4,
    marginTop: 12,
    marginBottom: 3,
  },
  paragraph: { fontSize: 8.5, color: "#334155", lineHeight: 1.65, marginBottom: 6 },
  // signatures
  sigSection: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER },
  sigRow: { flexDirection: "row", gap: 24 },
  sigBox: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: DARK, height: 36, marginBottom: 4 },
  sigLabel: { fontSize: 7, color: SLATE, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  sigDate: { marginTop: 10 },
  footer: { marginTop: 14, fontSize: 7, color: "#94a3b8", textAlign: "center" as const },
});

function fmtPhone(p: string | null | undefined): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function parseTemplate(text: string): { type: "heading" | "body"; text: string }[] {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const result: { type: "heading" | "body"; text: string }[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const firstLine = lines[0];
    const rest = lines.slice(1).join("\n").trim();

    const isHeading =
      firstLine.length >= 3 &&
      firstLine === firstLine.toUpperCase() &&
      /[A-Z]/.test(firstLine);

    if (isHeading) {
      result.push({ type: "heading", text: firstLine });
      if (rest) result.push({ type: "body", text: rest });
    } else {
      result.push({ type: "body", text: block });
    }
  }
  return result;
}

export interface ContractPDFProps {
  org: {
    name: string;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    phone?: string | null;
    email?: string | null;
    licenseNumber?: string | null;
    contractTemplate?: string | null;
  };
  customer: {
    firstName: string;
    lastName: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  serviceAddress: string;
  serviceType: string;
  pricePerService: number;
  numServices: number;
  totalPrice: number;
  date: string;
}

export function ContractPDF({
  org,
  customer,
  serviceAddress,
  serviceType,
  pricePerService,
  numServices,
  totalPrice,
  date,
}: ContractPDFProps) {
  const rawTemplate: string = org.contractTemplate ?? DEFAULT_CONTRACT_TEMPLATE;

  const filled = applyVariables(rawTemplate, {
    company_name: org.name,
    state: org.state ?? "your state",
  });

  const sections = parseTemplate(filled);

  const orgMeta = [
    [org.addressLine1, org.city && org.state ? `${org.city}, ${org.state} ${org.zip ?? ""}` : null]
      .filter(Boolean)
      .join(", "),
    org.phone ? fmtPhone(org.phone) : null,
    org.email,
    org.licenseNumber ? `License #${org.licenseNumber}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const customerName =
    customer.companyName ??
    `${customer.firstName} ${customer.lastName}`;

  return (
    <Document title={`Service Agreement — ${customerName}`}>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{org.name}</Text>
            {orgMeta ? <Text style={s.companyMeta}>{orgMeta}</Text> : null}
          </View>
          <Text style={s.badge}>SERVICE AGREEMENT</Text>
        </View>

        {/* Customer Info */}
        <View style={s.infoBox}>
          <Text style={s.infoBoxTitle}>Customer Information</Text>
          <View style={s.infoRow}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Name / Company</Text>
              <Text style={s.infoValue}>{customerName}</Text>
              {customer.companyName && (
                <Text style={s.infoValueMuted}>
                  {customer.firstName} {customer.lastName}
                </Text>
              )}
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Service Address</Text>
              <Text style={s.infoValue}>{serviceAddress}</Text>
            </View>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Phone</Text>
              <Text style={s.infoValue}>{fmtPhone(customer.phone) || "—"}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{customer.email || "—"}</Text>
            </View>
          </View>
          <View style={s.infoRow}>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Service Type</Text>
              <Text style={s.infoValue}>{serviceType}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Price Per Service</Text>
              <Text style={s.infoValue}>{fmtCurrency(pricePerService)}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Number of Services</Text>
              <Text style={s.infoValue}>{numServices}</Text>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Total Agreement Price</Text>
              <Text style={s.infoValue}>{fmtCurrency(totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* Contract body */}
        {sections.map((sec, i) =>
          sec.type === "heading" ? (
            <Text key={i} style={s.sectionHeader}>
              {sec.text}
            </Text>
          ) : (
            <Text key={i} style={s.paragraph}>
              {sec.text}
            </Text>
          )
        )}

        {/* Signatures */}
        <View style={s.sigSection}>
          <View style={s.sigRow}>
            <View style={s.sigBox}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Customer Signature</Text>
              <Text style={[s.sigLabel, s.sigDate]}>Date: _______________</Text>
            </View>
            <View style={s.sigBox}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{org.name} Representative</Text>
              <Text style={[s.sigLabel, s.sigDate]}>Date: _______________</Text>
            </View>
          </View>
        </View>

        <Text style={s.footer}>
          Generated {date} · {org.name}
        </Text>
      </Page>
    </Document>
  );
}
