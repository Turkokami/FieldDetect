"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
};

type Estimate = {
  id: string;
  estimateNumber: string;
  status: string;
  title: string | null;
  serviceType: string;
  scopeNotes: string | null;
  internalNotes: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  convertedAt: string | null;
  convertedToAppointmentId: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  } | null;
  lineItems: LineItem[];
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: "Draft",     bg: "#f1f5f9", color: "#64748b" },
  SENT:      { label: "Sent",      bg: "#dbeafe", color: "#1d4ed8" },
  VIEWED:    { label: "Viewed",    bg: "#e0e7ff", color: "#4338ca" },
  ACCEPTED:  { label: "Accepted",  bg: "#dcfce7", color: "#15803d" },
  DECLINED:  { label: "Declined",  bg: "#fee2e2", color: "#b91c1c" },
  EXPIRED:   { label: "Expired",   bg: "#f1f5f9", color: "#94a3b8" },
  CONVERTED: { label: "Converted", bg: "#d1fae5", color: "#065f46" },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EstimateDetailClient({ estimate: initial }: { estimate: Estimate }) {
  const router = useRouter();
  const [estimate, setEstimate] = useState(initial);
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [convertError, setConvertError] = useState("");
  const [toast, setToast] = useState("");

  const cfg = STATUS_CONFIG[estimate.status] ?? { label: estimate.status, bg: "#f1f5f9", color: "#64748b" };
  const customerName = estimate.customer.companyName ?? `${estimate.customer.firstName} ${estimate.customer.lastName}`;
  const canSend = ["DRAFT", "SENT", "VIEWED"].includes(estimate.status);
  const canConvert = estimate.status === "ACCEPTED";
  const canMarkAccepted = ["SENT", "VIEWED"].includes(estimate.status);
  const canMarkDeclined = ["SENT", "VIEWED"].includes(estimate.status);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSend = async () => {
    if (!estimate.customer.email) {
      showToast("Customer has no email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setEstimate((e) => ({ ...e, status: "SENT", sentAt: data.data.sentAt }));
      showToast("Estimate sent to " + estimate.customer.email);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setEstimate((e) => ({ ...e, status: data.data.status, acceptedAt: data.data.acceptedAt, declinedAt: data.data.declinedAt }));
      showToast(`Marked as ${newStatus.toLowerCase()}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleConvert = async () => {
    if (!scheduledDate) { setConvertError("Please select a scheduled date"); return; }
    setConverting(true);
    setConvertError("");
    try {
      const res = await fetch(`/api/estimates/${estimate.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: new Date(scheduledDate).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Convert failed");
      setEstimate((e) => ({ ...e, status: "CONVERTED", convertedToAppointmentId: data.data.id }));
      setShowConvertModal(false);
      showToast("Estimate converted to appointment");
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Convert failed");
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    const res = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
    if (res.ok) router.push("/estimates");
    else showToast("Delete failed");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-foreground text-background text-sm font-semibold px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/estimates" className="text-sm text-muted-foreground hover:text-foreground">
              ← Estimates
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{estimate.estimateNumber}</h1>
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          {estimate.title && (
            <p className="text-sm text-muted-foreground mt-1">{estimate.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canSend && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60"
            >
              {sending ? "Sending…" : estimate.status === "DRAFT" ? "Send to Customer" : "Resend"}
            </button>
          )}
          {canMarkAccepted && (
            <button
              onClick={() => handleStatusUpdate("ACCEPTED")}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#16a34a" }}
            >
              Mark Accepted
            </button>
          )}
          {canMarkDeclined && (
            <button
              onClick={() => handleStatusUpdate("DECLINED")}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Mark Declined
            </button>
          )}
          {canConvert && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "#0ABAB5" }}
            >
              Convert to Job →
            </button>
          )}
          {estimate.convertedToAppointmentId && (
            <Link
              href={`/scheduling/${estimate.convertedToAppointmentId}`}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
            >
              View Appointment →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Line Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lineItems.map((li) => (
                  <tr key={li.id} className="border-t border-border/50">
                    <td className="px-4 py-3">{li.description}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{li.quantity}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(li.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-border space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              {estimate.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({estimate.taxRate}%)</span>
                  <span>{formatCurrency(estimate.taxAmount)}</span>
                </div>
              )}
              {estimate.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{formatCurrency(estimate.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                <span>Total</span>
                <span style={{ color: "#0ABAB5" }}>{formatCurrency(estimate.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Scope Notes */}
          {estimate.scopeNotes && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide mb-2">Scope of Work</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{estimate.scopeNotes}</p>
            </div>
          )}

          {/* Internal Notes */}
          {estimate.internalNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Internal Notes (not sent to customer)</h2>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{estimate.internalNotes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Customer</h2>
            <div className="font-semibold text-foreground">{customerName}</div>
            {estimate.customer.email && (
              <a href={`mailto:${estimate.customer.email}`} className="text-sm block mt-1" style={{ color: "#0ABAB5" }}>
                {estimate.customer.email}
              </a>
            )}
            {estimate.customer.phone && (
              <a href={`tel:${estimate.customer.phone}`} className="text-sm text-muted-foreground block mt-0.5">
                {estimate.customer.phone}
              </a>
            )}
            <Link
              href={`/customers/${estimate.customer.id}`}
              className="text-xs font-semibold mt-3 block"
              style={{ color: "#0ABAB5" }}
            >
              View customer →
            </Link>
          </div>

          {/* Property */}
          {estimate.property && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Property</h2>
              <div className="font-semibold text-foreground">{estimate.property.name}</div>
              <div className="text-sm text-muted-foreground">
                {estimate.property.addressLine1}<br />
                {estimate.property.city}, {estimate.property.state}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Timeline</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(estimate.createdAt)}</span>
              </div>
              {estimate.validUntil && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid until</span>
                  <span>{formatDate(estimate.validUntil)}</span>
                </div>
              )}
              {estimate.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent</span>
                  <span>{formatDate(estimate.sentAt)}</span>
                </div>
              )}
              {estimate.viewedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Viewed</span>
                  <span>{formatDate(estimate.viewedAt)}</span>
                </div>
              )}
              {estimate.acceptedAt && (
                <div className="flex justify-between text-green-600">
                  <span>Accepted</span>
                  <span>{formatDate(estimate.acceptedAt)}</span>
                </div>
              )}
              {estimate.declinedAt && (
                <div className="flex justify-between text-red-600">
                  <span>Declined</span>
                  <span>{formatDate(estimate.declinedAt)}</span>
                </div>
              )}
              {estimate.convertedAt && (
                <div className="flex justify-between text-green-700">
                  <span>Converted</span>
                  <span>{formatDate(estimate.convertedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {["DRAFT", "DECLINED", "EXPIRED"].includes(estimate.status) && (
            <button
              onClick={handleDelete}
              className="w-full text-xs font-semibold text-red-500 hover:text-red-700 py-2 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete Estimate
            </button>
          )}
        </div>
      </div>

      {/* Convert to Job Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Convert to Job</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will create a scheduled appointment from this estimate.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40"
                />
              </div>
              {convertError && (
                <p className="text-sm text-red-600">{convertError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={converting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "#0ABAB5" }}
              >
                {converting ? "Converting…" : "Create Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
