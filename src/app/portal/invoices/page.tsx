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

export default async function PortalInvoicesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">{invoices.length} total invoices</p>
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
              return (
                <Link
                  key={inv.id}
                  href={`/portal/invoices/${inv.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}1a` }}
                  >
                    <Receipt className="h-4.5 w-4.5" style={{ color: cfg.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{inv.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">Issued {formatDate(inv.issueDate)}</span>
                      {inv.dueDate && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            Due {formatDate(inv.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(inv.totalAmount))}</div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
