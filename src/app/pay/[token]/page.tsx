"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type LineItem = { id: string; description: string; quantity: number; unitPrice: number; total: number };
type Payment  = { id: string; amount: number; method: string; processedAt: string | null };
type InvoiceData = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  balanceDue: number;
  notes: string | null;
  lineItems: LineItem[];
  payments: Payment[];
  customer: { firstName: string; lastName: string; companyName: string | null };
  organization: { name: string; phone: string | null; email: string | null; logoUrl: string | null; addressLine1: string | null; city: string | null; state: string | null };
};

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", VIEWED: "Viewed",
  PARTIALLY_PAID: "Partially Paid", PAID: "Paid", OVERDUE: "Overdue",
  CANCELLED: "Cancelled", REFUNDED: "Refunded",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#64748b", SENT: "#0ABAB5", VIEWED: "#0ABAB5",
  PARTIALLY_PAID: "#ca8a04", PAID: "#16a34a", OVERDUE: "#dc2626",
  CANCELLED: "#94a3b8", REFUNDED: "#64748b",
};

export default function GuestPayPage() {
  const params   = useParams<{ token: string }>();
  const search   = useSearchParams();
  const token    = params.token;
  const paySuccess = search.get("payment") === "success";

  const [invoice, setInvoice]   = useState<InvoiceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    fetch(`/api/public/invoice/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setInvoice(d.data); })
      .catch(() => setError("Unable to load invoice."))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    setPaying(true);
    setPayError("");
    try {
      const res  = await fetch(`/api/public/checkout/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to start payment");
      if (data.data?.url) window.location.href = data.data.url;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading invoice…</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invoice not found</h1>
          <p className="text-sm text-slate-500">{error || "This payment link may be invalid or expired."}</p>
        </div>
      </div>
    );
  }

  const org         = invoice.organization;
  const isPaid      = invoice.status === "PAID";
  const isCancelled = ["CANCELLED", "REFUNDED"].includes(invoice.status);
  const statusColor = STATUS_COLOR[invoice.status] ?? "#64748b";
  const statusLabel = STATUS_LABEL[invoice.status] ?? invoice.status;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Payment success banner */}
        {paySuccess && (
          <div className="rounded-xl px-5 py-4 flex items-center gap-3 bg-green-50 border border-green-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm font-semibold text-green-700">
              Payment received — thank you! Your receipt will be emailed to you.
            </p>
          </div>
        )}

        {/* Invoice card */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }} className="px-6 py-5 flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <span className="text-3xl">🐾</span>
            )}
            <div>
              <div className="text-white font-bold text-lg leading-tight">{org.name}</div>
              {(org.phone || org.email) && (
                <div className="text-white/70 text-xs">{org.phone}{org.phone && org.email ? " · " : ""}{org.email}</div>
              )}
            </div>
          </div>

          {/* Invoice meta */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Invoice</div>
              <div className="text-white font-bold text-xl font-mono">#{invoice.invoiceNumber}</div>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${statusColor}33`, color: statusColor }}>
                {statusLabel}
              </span>
              <div className="text-slate-400 text-xs mt-1">Issued {fmtDate(invoice.issueDate)}</div>
              {invoice.dueDate && (
                <div className={`text-xs font-semibold mt-0.5 ${invoice.status === "OVERDUE" ? "text-red-400" : "text-amber-400"}`}>
                  Due {fmtDate(invoice.dueDate)}
                </div>
              )}
            </div>
          </div>

          {/* Bill to */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Bill To</div>
            <div className="text-sm font-semibold text-slate-900">
              {invoice.customer.companyName ?? `${invoice.customer.firstName} ${invoice.customer.lastName}`}
            </div>
            {invoice.customer.companyName && (
              <div className="text-xs text-slate-500">{invoice.customer.firstName} {invoice.customer.lastName}</div>
            )}
          </div>

          {/* Line items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Rate</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-slate-800">{item.description}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(item.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 px-6 py-4 space-y-1.5">
            {invoice.subtotal !== invoice.totalAmount && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span><span>{fmt(invoice.subtotal)}</span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span><span>{fmt(invoice.taxAmount)}</span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span><span>-{fmt(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Total</span><span>{fmt(invoice.totalAmount)}</span>
            </div>
            {invoice.payments.length > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Amount Paid</span>
                <span>-{fmt(invoice.payments.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            )}
            {invoice.balanceDue > 0 && (
              <div className="flex justify-between text-base font-bold text-red-600 pt-1">
                <span>Balance Due</span><span>{fmt(invoice.balanceDue)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 pb-4">
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 border-l-4 border-teal-400">
                {invoice.notes}
              </div>
            </div>
          )}
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Payment History</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {invoice.payments.map((pmt) => (
                <div key={pmt.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{pmt.method.replace(/_/g, " ")}</div>
                    <div className="text-xs text-slate-400">{fmtDate(pmt.processedAt)}</div>
                  </div>
                  <div className="text-sm font-semibold text-green-600">{fmt(pmt.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pay CTA */}
        {!isPaid && !isCancelled && invoice.balanceDue > 0 && (
          <div className="bg-white rounded-2xl shadow p-5 text-center space-y-3">
            <div className="text-lg font-bold text-slate-900">
              Balance due: <span style={{ color: "#0ABAB5" }}>{fmt(invoice.balanceDue)}</span>
            </div>
            {payError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{payError}</p>
            )}
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3.5 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }}
            >
              {paying ? "Redirecting to payment…" : "Pay with Card →"}
            </button>
            <p className="text-xs text-slate-400">
              Secured by Stripe · No account required
            </p>
          </div>
        )}

        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-base font-bold text-green-800">Paid in full — thank you!</div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Questions? Contact {org.name}{org.phone ? ` at ${org.phone}` : ""}{org.email ? ` or ${org.email}` : ""}
        </p>
      </div>
    </div>
  );
}
