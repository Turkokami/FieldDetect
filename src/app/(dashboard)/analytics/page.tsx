import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const orgId = user.organizationId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalInspections,
    inspectionsThisMonth,
    inspectionsLastMonth,
    positiveRate,
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    revenueYTD,
    openInvoices,
    topCustomers,
    resultBreakdown,
    monthlyInspections,
  ] = await Promise.all([
    prisma.inspection.count({ where: { organizationId: orgId } }),
    prisma.inspection.count({
      where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.inspection.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.inspection.count({
      where: {
        organizationId: orgId,
        overallResult: { in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"] },
      },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID" },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: thirtyDaysAgo } },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId: orgId,
        status: "PAID",
        paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: startOfYear } },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { balanceDue: true },
      _count: true,
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { appointments: true, invoices: true } },
        invoices: {
          where: { status: "PAID" },
          select: { paidAmount: true },
        },
      },
      orderBy: { appointments: { _count: "desc" } },
      take: 5,
    }),
    prisma.inspection.groupBy({
      by: ["overallResult"],
      where: { organizationId: orgId, overallResult: { not: null } },
      _count: true,
    }),
    prisma.inspection.findMany({
      where: { organizationId: orgId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Group monthly inspections
  const monthCounts: Record<string, number> = {};
  for (const insp of monthlyInspections) {
    const key = insp.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    monthCounts[key] = (monthCounts[key] ?? 0) + 1;
  }

  const positiveRatePercent = totalInspections > 0
    ? ((positiveRate / totalInspections) * 100).toFixed(1)
    : "0.0";

  const inspectionChange = inspectionsLastMonth > 0
    ? (((inspectionsThisMonth - inspectionsLastMonth) / inspectionsLastMonth) * 100).toFixed(0)
    : inspectionsThisMonth > 0 ? "100" : "0";

  const revenueThisMonthVal = Number(revenueThisMonth._sum.paidAmount ?? 0);
  const revenueLastMonthVal = Number(revenueLastMonth._sum.paidAmount ?? 0);
  const revenueChange = revenueLastMonthVal > 0
    ? (((revenueThisMonthVal - revenueLastMonthVal) / revenueLastMonthVal) * 100).toFixed(0)
    : revenueThisMonthVal > 0 ? "100" : "0";

  const RESULT_LABELS: Record<string, string> = {
    NEGATIVE: "Negative",
    POSITIVE_K9_ALERT: "K9 Alert",
    VISUAL_CONFIRMATION: "Visual Confirmed",
    INCONCLUSIVE: "Inconclusive",
    UNABLE_TO_INSPECT: "Unable to Inspect",
    ACCESS_DENIED: "Access Denied",
    FOLLOW_UP_REQUIRED: "Follow-Up Required",
  };

  const RESULT_COLORS: Record<string, string> = {
    NEGATIVE: "bg-green-500",
    POSITIVE_K9_ALERT: "bg-red-500",
    VISUAL_CONFIRMATION: "bg-red-400",
    INCONCLUSIVE: "bg-yellow-400",
    UNABLE_TO_INSPECT: "bg-gray-400",
    ACCESS_DENIED: "bg-orange-400",
    FOLLOW_UP_REQUIRED: "bg-blue-400",
  };

  const totalResults = resultBreakdown.reduce((s, r) => s + r._count, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Business performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Inspections (30d)
          </div>
          <div className="text-3xl font-bold text-foreground">{inspectionsThisMonth}</div>
          <div className={`text-xs mt-1 ${parseInt(inspectionChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {parseInt(inspectionChange) >= 0 ? "+" : ""}{inspectionChange}% vs last month
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Revenue (30d)
          </div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(revenueThisMonthVal)}</div>
          <div className={`text-xs mt-1 ${parseInt(revenueChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {parseInt(revenueChange) >= 0 ? "+" : ""}{revenueChange}% vs last month
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Revenue YTD
          </div>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(Number(revenueYTD._sum.paidAmount ?? 0))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Since Jan 1</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Outstanding
          </div>
          <div className="text-3xl font-bold text-destructive">
            {formatCurrency(Number(openInvoices._sum.balanceDue ?? 0))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {openInvoices._count} open invoices
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Results Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Detection Results (All Time)
          </h2>
          <div className="mb-3">
            <div className="text-sm text-muted-foreground mb-1">
              Positive Rate: <span className="font-bold text-foreground">{positiveRatePercent}%</span>
            </div>
          </div>
          <div className="space-y-3">
            {resultBreakdown
              .sort((a, b) => b._count - a._count)
              .map((r) => {
                const pct = totalResults > 0 ? (r._count / totalResults) * 100 : 0;
                return (
                  <div key={r.overallResult}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">
                        {RESULT_LABELS[r.overallResult ?? ""] ?? r.overallResult?.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {r._count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${RESULT_COLORS[r.overallResult ?? ""] ?? "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Top Customers
          </h2>
          <div className="space-y-3">
            {topCustomers.map((customer, i) => {
              const lifetime = customer.invoices.reduce((s, inv) => s + Number(inv.paidAmount), 0);
              return (
                <div key={customer.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {customer.firstName} {customer.lastName}
                      {customer.companyName && (
                        <span className="text-muted-foreground"> — {customer.companyName}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customer._count.appointments} appointments
                    </div>
                  </div>
                  <div className="text-sm font-medium text-foreground">{formatCurrency(lifetime)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Inspections — Last 6 Months
          </h2>
          <div className="flex items-end gap-4 h-32">
            {Object.entries(monthCounts).map(([month, count]) => {
              const maxCount = Math.max(...Object.values(monthCounts), 1);
              const heightPct = (count / maxCount) * 100;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs font-medium text-foreground">{count}</div>
                  <div className="w-full bg-muted rounded-t-md overflow-hidden" style={{ height: "80px" }}>
                    <div
                      className="w-full bg-primary rounded-t-md transition-all"
                      style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{month}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Total inspections all time: {totalInspections}
      </div>
    </div>
  );
}
