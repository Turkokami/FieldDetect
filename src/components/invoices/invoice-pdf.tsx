import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    backgroundColor: "#ffffff",
    padding: "48 48 60 48",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: "2 solid #0f172a",
  },
  brandName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  brandMeta: { fontSize: 9, color: "#64748b", marginTop: 3, lineHeight: 1.6 },
  invoiceBadge: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569",
    textTransform: "uppercase", letterSpacing: 1,
    backgroundColor: "#f1f5f9", borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6,
  },
  invoiceNumber: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#64748b", textAlign: "right", marginTop: 2 },
  // Status banner
  statusBanner: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8, marginBottom: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  statusText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  statusSub: { fontSize: 9, marginTop: 2 },
  // Two-col section
  twoCol: { flexDirection: "row", gap: 20, marginBottom: 24 },
  colHalf: { flex: 1 },
  sectionLabel: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b",
    textTransform: "uppercase", letterSpacing: 1,
    marginBottom: 6, paddingBottom: 4,
    borderBottom: "1 solid #e2e8f0",
  },
  infoName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  infoLine: { fontSize: 9, color: "#64748b", marginTop: 2 },
  // Line items table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 7, paddingHorizontal: 10,
    borderBottom: "1 solid #e2e8f0",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8, paddingHorizontal: 10,
    borderBottom: "1 solid #f1f5f9",
  },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "center" },
  colPrice: { width: 70, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  thText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#475569", textTransform: "uppercase", letterSpacing: 0.8 },
  tdText: { fontSize: 10, color: "#1e293b" },
  tdSub: { fontSize: 8, color: "#64748b", marginTop: 1 },
  // Totals
  totalsWrapper: { alignItems: "flex-end", marginTop: 12 },
  totalsBox: { width: 200 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 9, color: "#64748b" },
  totalsValue: { fontSize: 9, color: "#1e293b" },
  totalsBold: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  totalsDivider: { borderTop: "1 solid #e2e8f0", marginVertical: 4 },
  balanceDue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#dc2626" },
  balancePaid: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  // Notes
  notesBox: {
    backgroundColor: "#f8fafc", borderRadius: 6,
    padding: "10 12", marginTop: 16,
    border: "1 solid #e2e8f0",
  },
  notesText: { fontSize: 9, color: "#334155", lineHeight: 1.6 },
  // Footer
  footer: {
    position: "absolute", bottom: 32, left: 48, right: 48,
    borderTop: "1 solid #e2e8f0", paddingTop: 8,
    flexDirection: "row", justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#94a3b8" },
});

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  referenceNumber: string | null;
  processedAt: Date | string | null;
  createdAt: Date | string;
};

type InvoicePDFProps = {
  org: {
    name: string;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
  };
  customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    billingAddressLine1: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingZip: string | null;
  };
  property: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  invoice: {
    invoiceNumber: string;
    status: string;
    issueDate: Date | string;
    dueDate: Date | string | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    notes: string | null;
    inspectionNumber: string | null;
  };
  lineItems: LineItem[];
  payments: Payment[];
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (d: Date | string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT:          { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  SENT:           { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  VIEWED:         { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  PARTIALLY_PAID: { bg: "#fefce8", text: "#92400e", border: "#fde047" },
  PAID:           { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  OVERDUE:        { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
  CANCELLED:      { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" },
};

const PAYMENT_METHOD: Record<string, string> = {
  CASH: "Cash", CHECK: "Check", CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card", ACH: "ACH", STRIPE: "Card (Online)", OTHER: "Other",
};

export function InvoicePDF({
  org, customer, property, invoice, lineItems, payments,
}: InvoicePDFProps) {
  const statusStyle = STATUS_COLORS[invoice.status] ?? STATUS_COLORS.DRAFT;
  const isOverdue = invoice.status === "OVERDUE" || (
    invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.balanceDue > 0
  );

  return (
    <Document title={`Invoice #${invoice.invoiceNumber}`} author={org.name}>
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>{org.name}</Text>
            {org.addressLine1 && (
              <Text style={styles.brandMeta}>
                {org.addressLine1}{org.city ? `, ${org.city}, ${org.state}` : ""}
              </Text>
            )}
            {org.phone && <Text style={styles.brandMeta}>{org.phone}</Text>}
            {org.email && <Text style={styles.brandMeta}>{org.email}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceBadge}>Invoice</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Issued {fmtDate(invoice.issueDate)}</Text>
            {invoice.dueDate && (
              <Text style={[styles.invoiceMeta, isOverdue ? { color: "#dc2626" } : {}]}>
                Due {fmtDate(invoice.dueDate)}{isOverdue ? " — OVERDUE" : ""}
              </Text>
            )}
            {invoice.inspectionNumber && (
              <Text style={[styles.invoiceMeta, { marginTop: 4 }]}>
                Ref: {invoice.inspectionNumber}
              </Text>
            )}
          </View>
        </View>

        {/* ── Status banner ── */}
        <View style={[styles.statusBanner, {
          backgroundColor: statusStyle.bg,
          border: `1 solid ${statusStyle.border}`,
        }]}>
          <View>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {invoice.status.replace(/_/g, " ")}
            </Text>
            <Text style={[styles.statusSub, { color: statusStyle.text }]}>
              Total {fmt(invoice.totalAmount)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {invoice.paidAmount > 0 && (
              <Text style={{ fontSize: 9, color: "#16a34a" }}>
                Paid: {fmt(invoice.paidAmount)}
              </Text>
            )}
            <Text style={[
              { fontSize: 14, fontFamily: "Helvetica-Bold" },
              invoice.balanceDue > 0 ? { color: "#dc2626" } : { color: "#16a34a" },
            ]}>
              Balance: {fmt(invoice.balanceDue)}
            </Text>
          </View>
        </View>

        {/* ── Bill To / Service Location ── */}
        <View style={styles.twoCol}>
          <View style={styles.colHalf}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.infoName}>
              {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
            </Text>
            {customer.companyName && (
              <Text style={styles.infoLine}>{customer.firstName} {customer.lastName}</Text>
            )}
            {customer.billingAddressLine1 && (
              <Text style={styles.infoLine}>
                {customer.billingAddressLine1}{"\n"}{customer.billingCity}, {customer.billingState} {customer.billingZip}
              </Text>
            )}
            {customer.email && <Text style={styles.infoLine}>{customer.email}</Text>}
          </View>

          {property && (
            <View style={styles.colHalf}>
              <Text style={styles.sectionLabel}>Service Location</Text>
              <Text style={styles.infoName}>{property.name}</Text>
              <Text style={styles.infoLine}>{property.addressLine1}</Text>
              <Text style={styles.infoLine}>{property.city}, {property.state} {property.zip}</Text>
            </View>
          )}
        </View>

        {/* ── Line Items ── */}
        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Services</Text>
        <View style={{ border: "1 solid #e2e8f0", borderRadius: 6, overflow: "hidden", marginBottom: 4 }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colDesc]}>Description</Text>
            <Text style={[styles.thText, styles.colQty]}>Qty</Text>
            <Text style={[styles.thText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.thText, styles.colTotal]}>Total</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={item.id} style={[
              styles.tableRow,
              i === lineItems.length - 1 ? { borderBottom: "0 solid transparent" } : {},
            ]}>
              <Text style={[styles.tdText, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.tdText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tdText, styles.colPrice]}>{fmt(item.unitPrice)}</Text>
              <Text style={[styles.tdText, { ...styles.colTotal, fontFamily: "Helvetica-Bold" }]}>
                {fmt(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsWrapper}>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.subtotal)}</Text>
            </View>
            {invoice.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={[styles.totalsValue, { color: "#16a34a" }]}>-{fmt(invoice.discountAmount)}</Text>
              </View>
            )}
            {invoice.taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax ({(invoice.taxRate * 100).toFixed(1)}%)</Text>
                <Text style={styles.totalsValue}>{fmt(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsBold}>Total</Text>
              <Text style={styles.totalsBold}>{fmt(invoice.totalAmount)}</Text>
            </View>
            {invoice.paidAmount > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsLabel, { color: "#16a34a" }]}>Paid</Text>
                  <Text style={[styles.totalsValue, { color: "#16a34a" }]}>-{fmt(invoice.paidAmount)}</Text>
                </View>
                <View style={styles.totalsDivider} />
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsBold}>Balance Due</Text>
                  <Text style={invoice.balanceDue > 0 ? styles.balanceDue : styles.balancePaid}>
                    {fmt(invoice.balanceDue)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Payments ── */}
        {payments.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionLabel}>Payment History</Text>
            <View style={{ border: "1 solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
              {payments.map((p, i) => (
                <View key={p.id} style={[
                  { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, paddingHorizontal: 10, borderBottom: "1 solid #f1f5f9" },
                  i === payments.length - 1 ? { borderBottom: "0 solid transparent" } : {},
                ]}>
                  <View>
                    <Text style={{ fontSize: 9, color: "#1e293b", fontFamily: "Helvetica-Bold" }}>
                      {PAYMENT_METHOD[p.method] ?? p.method}
                      {p.referenceNumber ? ` #${p.referenceNumber}` : ""}
                    </Text>
                    <Text style={{ fontSize: 8, color: "#64748b", marginTop: 1 }}>
                      {fmtDate(p.processedAt ?? p.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: "#16a34a", fontFamily: "Helvetica-Bold" }}>
                    +{fmt(p.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Notes ── */}
        {invoice.notes && (
          <View style={styles.notesBox}>
            <Text style={[styles.sectionLabel, { borderBottom: "0 solid transparent", marginBottom: 4 }]}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{org.name} · Invoice #{invoice.invoiceNumber}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
