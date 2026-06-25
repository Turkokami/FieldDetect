import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = { title: "Invoices" };

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

const UNPAID = new Set(["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"]);

export default async function PortalInvoicesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    orderBy: { issueDate: "desc" },
  });

  const unpaidTotal = invoices
    .filter((i) => UNPAID.has(i.status))
    .reduce((sum, i) => sum + Number(i.balanceDue), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} total invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        {unpaidTotal > 0 && (
          <div className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>
            Outstanding: {formatCurrency(unpaidTotal)}
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {invoices.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status] ?? { label: inv.status, color: "#64748b" };
              const isOverdue = inv.status === "OVERDUE";
              const canPay = UNPAID.has(inv.status) && Number(inv.balanceDue) > 0 && inv.paymentToken;
              return (
                <div key={inv.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}1a` }}
                  >
                    <Receipt className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>

                  <Link href={`/portal/invoices/${inv.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{inv.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Issued {formatDate(inv.issueDate)}</span>
                      {inv.dueDate && (
                        <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          · Due {formatDate(inv.dueDate)}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(inv.totalAmount))}</div>
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {canPay && (
                      <Link
                        href={`/pay/${inv.paymentToken}`}
                        className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                        style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }}
                      >
                        Pay Now
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
