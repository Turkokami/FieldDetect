"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type LineItem = {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
  sortOrder: number;
};

type Invoice = {
  id: string;
  status: string;
  invoiceNumber: string;
  dueDate: Date | null;
  notes: string | null;
  discountAmount: number | string | null;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  taxCodeName: string | null;
  lineItems: LineItem[];
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
  taxRate: string;
};

type NewItemForm = {
  description: string;
  quantity: string;
  unitPrice: string;
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
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : "",
    notes: invoice.notes ?? "",
    discountAmount: invoice.discountAmount != null ? String(Number(invoice.discountAmount)) : "0",
    taxRate: String(Number(invoice.taxRate ?? 0)),
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.lineItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ description: string; quantity: string; unitPrice: string } | null>(null);
  const [newItem, setNewItem] = useState<NewItemForm>({ description: "", quantity: "1", unitPrice: "" });
  const [addingItem, setAddingItem] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);

  const subtotal = lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const discount = parseFloat(editForm.discountAmount) || 0;
  const taxRate = parseFloat(editForm.taxRate) || 0;
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

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

  const addLineItem = async () => {
    if (!newItem.description || !newItem.unitPrice) return;
    setItemLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newItem.description,
          quantity: parseFloat(newItem.quantity) || 1,
          unitPrice: parseFloat(newItem.unitPrice) || 0,
          sortOrder: lineItems.length,
        }),
      });
      if (!res.ok) { toast.error("Failed to add line item"); return; }
      const j = await res.json();
      setLineItems((prev) => [...prev, j.data]);
      setNewItem({ description: "", quantity: "1", unitPrice: "" });
      setAddingItem(false);
    } finally {
      setItemLoading(false);
    }
  };

  const saveEditItem = async (itemId: string) => {
    if (!editingItem) return;
    setItemLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/line-items?itemId=${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editingItem.description,
          quantity: parseFloat(editingItem.quantity) || 1,
          unitPrice: parseFloat(editingItem.unitPrice) || 0,
        }),
      });
      if (!res.ok) { toast.error("Failed to update line item"); return; }
      const j = await res.json();
      setLineItems((prev) => prev.map((i) => i.id === itemId ? j.data : i));
      setEditingItemId(null);
      setEditingItem(null);
    } finally {
      setItemLoading(false);
    }
  };

  const deleteLineItem = async (itemId: string) => {
    setItemLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/line-items?itemId=${itemId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete line item"); return; }
      setLineItems((prev) => prev.filter((i) => i.id !== itemId));
    } finally {
      setItemLoading(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        notes: editForm.notes || null,
        discountAmount: parseFloat(editForm.discountAmount) || 0,
        taxRate: parseFloat(editForm.taxRate) || 0,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      };
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
          <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Edit Invoice #{invoice.invoiceNumber}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>

            <form onSubmit={saveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                    <button
                      type="button"
                      onClick={() => setAddingItem(true)}
                      className="text-xs font-medium px-3 h-7 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground w-16">Qty</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-24">Unit Price</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-24">Total</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item) => (
                          editingItemId === item.id && editingItem ? (
                            <tr key={item.id} className="border-t border-border bg-primary/5">
                              <td className="px-2 py-1.5">
                                <input
                                  className="w-full h-8 px-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={editingItem.description}
                                  onChange={(e) => setEditingItem((p) => p ? { ...p, description: e.target.value } : p)}
                                  autoFocus
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number" min="0.01" step="0.01"
                                  className="w-full h-8 px-2 rounded border border-border bg-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={editingItem.quantity}
                                  onChange={(e) => setEditingItem((p) => p ? { ...p, quantity: e.target.value } : p)}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="number" min="0" step="0.01"
                                  className="w-full h-8 px-2 rounded border border-border bg-background text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={editingItem.unitPrice}
                                  onChange={(e) => setEditingItem((p) => p ? { ...p, unitPrice: e.target.value } : p)}
                                />
                              </td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">
                                ${((parseFloat(editingItem.quantity) || 0) * (parseFloat(editingItem.unitPrice) || 0)).toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex gap-1">
                                  <button type="button" onClick={() => saveEditItem(item.id)} disabled={itemLoading} className="text-xs px-2 h-7 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">✓</button>
                                  <button type="button" onClick={() => { setEditingItemId(null); setEditingItem(null); }} className="text-xs px-2 h-7 border border-border rounded text-muted-foreground hover:text-foreground">✕</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={item.id} className="border-t border-border hover:bg-muted/30 group">
                              <td className="px-3 py-2.5 text-foreground">{item.description}</td>
                              <td className="px-3 py-2.5 text-center text-foreground">{Number(item.quantity)}</td>
                              <td className="px-3 py-2.5 text-right text-foreground">${Number(item.unitPrice).toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-right text-foreground">${Number(item.total).toFixed(2)}</td>
                              <td className="px-2 py-2.5">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingItemId(item.id); setEditingItem({ description: item.description, quantity: String(Number(item.quantity)), unitPrice: String(Number(item.unitPrice)) }); }}
                                    className="text-xs px-1.5 h-6 border border-border rounded text-muted-foreground hover:text-foreground"
                                  >✎</button>
                                  <button
                                    type="button"
                                    onClick={() => deleteLineItem(item.id)}
                                    disabled={itemLoading}
                                    className="text-xs px-1.5 h-6 border border-border rounded text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-50"
                                  >✕</button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}

                        {/* Add new item row */}
                        {addingItem && (
                          <tr className="border-t border-border bg-primary/5">
                            <td className="px-2 py-1.5">
                              <input
                                className="w-full h-8 px-2 rounded border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Item description"
                                value={newItem.description}
                                onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                                autoFocus
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number" min="0.01" step="0.01"
                                className="w-full h-8 px-2 rounded border border-border bg-background text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="1"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number" min="0" step="0.01"
                                className="w-full h-8 px-2 rounded border border-border bg-background text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                                value={newItem.unitPrice}
                                onChange={(e) => setNewItem((p) => ({ ...p, unitPrice: e.target.value }))}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right text-muted-foreground text-sm">
                              ${((parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unitPrice) || 0)).toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <button type="button" onClick={addLineItem} disabled={itemLoading || !newItem.description || !newItem.unitPrice} className="text-xs px-2 h-7 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">Add</button>
                                <button type="button" onClick={() => { setAddingItem(false); setNewItem({ description: "", quantity: "1", unitPrice: "" }); }} className="text-xs px-2 h-7 border border-border rounded text-muted-foreground hover:text-foreground">✕</button>
                              </div>
                            </td>
                          </tr>
                        )}

                        {lineItems.length === 0 && !addingItem && (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted-foreground">
                              No line items — click Add Item above
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals + Tax + Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Tax Rate (%)</label>
                    <input
                      type="number" step="0.001" min="0" max="100"
                      value={editForm.taxRate}
                      onChange={(e) => setEditForm((f) => ({ ...f, taxRate: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="0.000"
                    />
                    {invoice.taxCodeName && (
                      <p className="text-xs text-muted-foreground mt-1">{invoice.taxCodeName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Discount ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={editForm.discountAmount}
                      onChange={(e) => setEditForm((f) => ({ ...f, discountAmount: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                {/* Running totals */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>−${discount.toFixed(2)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({taxRate}%)</span><span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5">
                    <span>Total</span><span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Due date + notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="Invoice notes visible to customer"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
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
