"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Invoice = {
  id: string;
  status: string;
  invoiceNumber: string;
  dueDate: Date | null;
  notes: string | null;
  discountAmount: number | string | null;
};

function DownloadPDFButton({ invoiceId }: { invoiceId: string }) {
  return (
    <a
      href={`/api/invoices/${invoiceId}/pdf`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      PDF
    </a>
  );
}

type Props = {
  invoice: Invoice;
  remaining: number;
  canDelete?: boolean;
};

type PaymentForm = {
  amount: string;
  method: string;
  referenceNumber: string;
  notes: string;
};

type EditForm = {
  dueDate: string;
  notes: string;
  discountAmount: string;
};

export default function InvoiceActions({ invoice, remaining, canDelete = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState("");

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: remaining.toFixed(2),
    method: "CHECK",
    referenceNumber: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState<EditForm>({
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : "",
    notes: invoice.notes ?? "",
    discountAmount: invoice.discountAmount != null ? String(Number(invoice.discountAmount)) : "0",
  });

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Request failed");
    }
    return res.json();
  };

  const sendInvoice = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send invoice");
      } else {
        toast.success("Invoice sent");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || undefined,
          notes: paymentForm.notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to record payment");
      } else {
        setShowPaymentModal(false);
        toast.success("Payment recorded");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const checkoutWithStripe = async () => {
    setLoading(true);
    setOpen(false);
    try {
      const res = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error ?? "Stripe not configured");
      }
    } finally {
      setLoading(false);
    }
  };

  const voidInvoice = async () => {
    setLoading(true);
    setOpen(false);
    try {
      await patch({ status: "CANCELLED" });
      toast.success("Invoice voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void invoice");
    } finally {
      setLoading(false);
    }
  };

  const saveWriteOff = async () => {
    setLoading(true);
    try {
      const appendedNotes = [invoice.notes, `Write-off: ${writeOffReason}`]
        .filter(Boolean).join("\n");
      await patch({ status: "CANCELLED", notes: appendedNotes });
      setShowWriteOffModal(false);
      toast.success("Invoice written off");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to write off invoice");
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        notes: editForm.notes || null,
        discountAmount: parseFloat(editForm.discountAmount) || 0,
      };
      if (editForm.dueDate) {
        body.dueDate = new Date(editForm.dueDate).toISOString();
      } else {
        body.dueDate = null;
      }
      await patch(body);
      setShowEditModal(false);
      toast.success("Invoice updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete invoice");
        setShowDeleteConfirm(false);
      } else {
        toast.success("Invoice deleted");
        router.push("/invoices");
      }
    } finally {
      setLoading(false);
    }
  };

  const canSend = !["PAID", "CANCELLED"].includes(invoice.status);
  const canVoid = invoice.status !== "CANCELLED";

  return (
    <>
      <DownloadPDFButton invoiceId={invoice.id} />
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          Actions
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-popover border border-border rounded-lg shadow-lg py-1">
              {canSend && (
                <button
                  onClick={sendInvoice}
                  className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Send by Email
                </button>
              )}
              {remaining > 0 && (
                <>
                  <button
                    onClick={() => { setOpen(false); setShowPaymentModal(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Record Payment
                  </button>
                  <button
                    onClick={checkoutWithStripe}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Pay with Stripe
                  </button>
                </>
              )}
              <button
                onClick={() => { setOpen(false); setShowEditModal(true); }}
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
              >
                Edit Invoice
              </button>
              {canVoid && (
                <>
                  <button
                    onClick={voidInvoice}
                    className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-muted transition-colors"
                  >
                    Void Invoice
                  </button>
                  <button
                    onClick={() => { setOpen(false); setWriteOffReason(""); setShowWriteOffModal(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-muted transition-colors"
                  >
                    Write Off
                  </button>
                </>
              )}
              {canDelete && (
                <>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { setOpen(false); setShowDeleteConfirm(true); }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-muted transition-colors"
                  >
                    Delete Invoice
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Record Payment</h2>
            <form onSubmit={recordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Amount</label>
                <input
                  type="number" step="0.01" min="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="DEBIT_CARD">Debit Card</option>
                  <option value="ACH">ACH / Bank Transfer</option>
                  <option value="STRIPE">Card (Online)</option>
                  <option value="OTHER">Venmo / Zelle / Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Reference # {paymentForm.method === "CHECK" ? "(check number)" : "(optional)"}
                </label>
                <input
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder={paymentForm.method === "CHECK" ? "1234" : ""}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Edit Invoice</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Discount ($)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={editForm.discountAmount}
                  onChange={(e) => setEditForm((f) => ({ ...f, discountAmount: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Invoice notes visible to customer"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Write-Off Modal */}
      {showWriteOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1">Write Off Invoice</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will cancel the invoice and record a write-off reason in the notes.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reason</label>
                <textarea
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Bad debt, client dispute, courtesy write-off..."
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowWriteOffModal(false)}
                  className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveWriteOff}
                  disabled={loading || !writeOffReason.trim()}
                  className="flex-1 h-10 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Write Off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Delete Invoice?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Invoice #{invoice.invoiceNumber} will be permanently deleted. This cannot be undone.
              Invoices with recorded payments cannot be deleted.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={deleteInvoice}
                disabled={loading}
                className="flex-1 h-10 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
