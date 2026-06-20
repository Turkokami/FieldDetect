import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = { title: "Invoice" };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:           { label: "Draft",          color: "#64748b" },
  SENT:            { label: "Sent",            color: "#0ABAB5" },
  VIEWED:          { label: "Viewed",          color: "#0ABAB5" },
  PARTIALLY_PAID:  { label: "Partially Paid",  color: "#ca8a04" },
  PAID:            { label: "Paid",            color: "#16a34a" },
  OVERDUE:         { label: "Overdue",         color: "#dc2626" },
  CANCELLED:       { label: "Cancelled",       color: "#94a3b8" },
  REFUNDED:        { label: "Refunded",        color: "#64748b" },
};

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId: customer.id },
    include: {
      lineItems: true,
      payments: true,
      organization: true,
    },
  });

  if (!invoice) notFound();

  const cfg = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, color: "#64748b" };
  const isPaid = invoice.status === "PAID";
  const totalPaid = invoice.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - totalPaid;

  const org = invoice.organization;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <Link href="/portal/invoices" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          All Invoices
        </Link>
        {isPaid && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Paid in full
          </div>
        )}
      </div>

      {/* Invoice card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{ background: "linear-gradient(135deg, #0A0F1A 0%, #0D1A1F 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-lg">🐾 {org.name}</span>
              </div>
              {org.phone && <div className="text-slate-400 text-xs">{org.phone}</div>}
              {org.email && <div className="text-slate-400 text-xs">{org.email}</div>}
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-base">INVOICE</div>
              <div className="text-slate-300 text-sm font-mono">{invoice.invoiceNumber}</div>
              <span
                className="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${cfg.color}33`, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="px-5 py-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Issue Date</div>
            <div className="text-sm font-semibold text-foreground mt-0.5">{formatDate(invoice.issueDate)}</div>
          </div>
          {invoice.dueDate && (
            <div className="px-5 py-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</div>
              <div className={`text-sm font-semibold mt-0.5 ${invoice.status === "OVERDUE" ? "text-destructive" : "text-foreground"}`}>
                {formatDate(invoice.dueDate)}
              </div>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rate</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-foreground">{item.description}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{Number(item.quantity)}</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-border px-5 py-4 space-y-2">
          {Number(invoice.subtotal) !== Number(invoice.totalAmount) && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal))}</span>
            </div>
          )}
          {Number(invoice.taxAmount) > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(Number(invoice.taxAmount))}</span>
            </div>
          )}
          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(Number(invoice.discountAmount))}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>Total</span>
            <span>{formatCurrency(Number(invoice.totalAmount))}</span>
          </div>
          {totalPaid > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Amount Paid</span>
              <span>-{formatCurrency(totalPaid)}</span>
            </div>
          )}
          {remaining > 0 && totalPaid > 0 && (
            <div className="flex justify-between text-base font-bold text-destructive">
              <span>Balance Due</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Payment History</h2>
          </div>
          <div className="divide-y divide-border">
            {invoice.payments.map((pmt) => (
              <div key={pmt.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{pmt.method.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(pmt.processedAt ?? pmt.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(pmt.amount))}</div>
                  <div className="text-xs" style={{ color: pmt.status === "COMPLETED" ? "#16a34a" : "#ca8a04" }}>
                    {pmt.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{invoice.notes}</p>
        </div>
      )}

      {/* Contact for payment */}
      {!isPaid && remaining > 0 && (
        <div
          className="rounded-xl p-5 text-center"
          style={{ background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.2)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#0ABAB5" }}>
            Ready to pay? Contact {org.name} to arrange payment.
          </p>
          {org.phone && <p className="text-sm text-muted-foreground mt-1">{org.phone}</p>}
          {org.email && <p className="text-sm text-muted-foreground">{org.email}</p>}
        </div>
      )}
    </div>
  );
}
