"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Receipt, ArrowUpRight, CheckSquare, Square, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  balanceDue: number;
  dueDate: string | null;
  createdAt: string;
  customer: { firstName: string; lastName: string; companyName: string | null };
  inspection: { inspectionNumber: string } | null;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:          { label: "Draft",       bg: "#f1f5f9", color: "#64748b" },
  SENT:           { label: "Sent",        bg: "#e0f2fe", color: "#0369a1" },
  VIEWED:         { label: "Viewed",      bg: "#e0f2fe", color: "#0369a1" },
  PARTIALLY_PAID: { label: "Partial",     bg: "#fef9c3", color: "#ca8a04" },
  PAID:           { label: "Paid",        bg: "#dcfce7", color: "#16a34a" },
  OVERDUE:        { label: "Overdue",     bg: "#fee2e2", color: "#dc2626" },
  CANCELLED:      { label: "Cancelled",   bg: "#f1f5f9", color: "#94a3b8" },
  REFUNDED:       { label: "Refunded",    bg: "#f1f5f9", color: "#64748b" },
};

const BULKABLE_STATUSES = new Set(["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE", "DRAFT"]);
const SENDABLE_STATUSES = new Set(["DRAFT", "SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"]);

export function InvoiceListClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const bulkable = invoices.filter((i) => BULKABLE_STATUSES.has(i.status)).map((i) => i.id);
    setSelected(new Set(bulkable));
  };

  const clearSelection = () => setSelected(new Set());

  const runBulk = async (action: "mark_paid" | "send") => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/invoices/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }

      if (action === "mark_paid") {
        toast.success(`${data.processed} invoice${data.processed !== 1 ? "s" : ""} marked as paid`);
      } else {
        toast.success(`Sent ${data.sent} invoice${data.sent !== 1 ? "s" : ""}${data.skipped > 0 ? `, ${data.skipped} skipped (no email)` : ""}`);
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const selectedCanSend = invoices.filter((i) => selected.has(i.id) && SENDABLE_STATUSES.has(i.status)).length;
  const selectedCanPay = invoices.filter((i) => selected.has(i.id) && i.status !== "PAID" && i.status !== "CANCELLED").length;

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      {selected.size > 0 ? (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {selectedCanPay > 0 && (
              <button
                onClick={() => runBulk("mark_paid")}
                disabled={bulkLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "#16a34a" }}
              >
                {bulkLoading ? "Working…" : `Mark ${selectedCanPay} Paid`}
              </button>
            )}
            {selectedCanSend > 0 && (
              <button
                onClick={() => runBulk("send")}
                disabled={bulkLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }}
              >
                {bulkLoading ? "Working…" : `Send ${selectedCanSend}`}
              </button>
            )}
            <button
              onClick={clearSelection}
              className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end">
          <button
            onClick={selectAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Select all unpaid
          </button>
        </div>
      )}

      {invoices.map((inv) => {
        const cfg = STATUS_CONFIG[inv.status] ?? { label: inv.status, bg: "#f1f5f9", color: "#64748b" };
        const isSel = selected.has(inv.id);
        const canSelect = BULKABLE_STATUSES.has(inv.status);

        return (
          <div
            key={inv.id}
            className={`rounded-xl border transition-colors ${isSel ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}
          >
            <div className="p-4 flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => canSelect && toggle(inv.id)}
                className={`mt-0.5 shrink-0 transition-opacity ${canSelect ? "opacity-100" : "opacity-20 cursor-default"}`}
              >
                {isSel
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>

              <Link href={`/invoices/${inv.id}`} className="flex-1 min-w-0 flex items-start gap-3">
                <div className="p-2 rounded-lg shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                  <Receipt className="h-4 w-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {inv.customer.companyName ?? `${inv.customer.firstName} ${inv.customer.lastName}`}
                    </p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground mb-1.5">
                    <span className="font-mono">{inv.invoiceNumber}</span>
                    {inv.inspection && <span>· {inv.inspection.inspectionNumber}</span>}
                    <span>· {formatDate(inv.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground text-sm">{formatCurrency(inv.totalAmount)}</span>
                      {inv.balanceDue > 0 && inv.balanceDue !== inv.totalAmount && (
                        <span className="text-xs text-amber-600 ml-2">{formatCurrency(inv.balanceDue)} due</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.dueDate && inv.status !== "PAID" && (
                        <span className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</span>
                      )}
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}

      {invoices.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No invoices found
        </div>
      )}
    </div>
  );
}
