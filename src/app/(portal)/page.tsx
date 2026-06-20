import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, Receipt, Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = { title: "My Portal" };

export default async function PortalPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({
    where: { clerkUserId: userId },
    include: {
      properties: { orderBy: { name: "asc" } },
      invoices: {
        where: { status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
        orderBy: { dueDate: "asc" },
        take: 5,
        include: { lineItems: true },
      },
    },
  });
  if (!customer) redirect("/sign-in");

  const recentInspections = await prisma.inspection.findMany({
    where: {
      property: { customerId: customer.id },
      status: { in: ["COMPLETED", "REPORT_SENT"] },
    },
    orderBy: { startTime: "desc" },
    take: 5,
    include: { property: true },
  });

  const totalOwed = customer.invoices.reduce((sum, inv) => {
    const paid = (inv as any).amountPaid ?? 0;
    return sum + (Number(inv.totalAmount) - Number(paid));
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {customer.companyName ?? customer.firstName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s your inspection and billing overview.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(10,186,181,0.12)" }}>
            <Building2 className="h-5 w-5" style={{ color: "#0ABAB5" }} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{customer.properties.length}</div>
            <div className="text-xs text-muted-foreground">Properties</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(10,186,181,0.12)" }}>
            <FileText className="h-5 w-5" style={{ color: "#0ABAB5" }} />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{recentInspections.length}</div>
            <div className="text-xs text-muted-foreground">Recent Reports</div>
          </div>
        </div>

        <div className={`rounded-xl border bg-card p-5 flex items-center gap-4 ${totalOwed > 0 ? "border-destructive/30" : "border-border"}`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: totalOwed > 0 ? "rgba(239,68,68,0.1)" : "rgba(10,186,181,0.12)" }}>
            <Receipt className="h-5 w-5" style={{ color: totalOwed > 0 ? "#ef4444" : "#0ABAB5" }} />
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalOwed > 0 ? "text-destructive" : "text-foreground"}`}>
              {formatCurrency(totalOwed)}
            </div>
            <div className="text-xs text-muted-foreground">Balance Due</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent inspections */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Recent Inspection Reports</h2>
            <Link href="/portal/reports" className="text-xs font-medium" style={{ color: "#0ABAB5" }}>View all</Link>
          </div>
          <div className="divide-y divide-border">
            {recentInspections.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No reports yet</div>
            )}
            {recentInspections.map((ins) => (
              <Link
                key={ins.id}
                href={`/portal/reports/${ins.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(10,186,181,0.1)" }}>
                  {ins.overallResult === "NEGATIVE" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : ins.overallResult === "POSITIVE_K9_ALERT" ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Clock className="h-4 w-4" style={{ color: "#0ABAB5" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{ins.property.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(ins.startTime)}</div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{ins.inspectionNumber}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Outstanding invoices */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">Outstanding Invoices</h2>
            <Link href="/portal/invoices" className="text-xs font-medium" style={{ color: "#0ABAB5" }}>View all</Link>
          </div>
          <div className="divide-y divide-border">
            {customer.invoices.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No outstanding invoices</div>
            )}
            {customer.invoices.map((inv) => {
              const isOverdue = inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < new Date());
              return (
                <Link
                  key={inv.id}
                  href={`/portal/invoices/${inv.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? "bg-destructive" : "bg-yellow-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{inv.invoiceNumber}</div>
                    {inv.dueDate && (
                      <div className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        Due {formatDate(inv.dueDate)}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{formatCurrency(Number(inv.totalAmount))}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
