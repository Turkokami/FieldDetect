import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Analytics" };

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "Bed Bug Inspection",
  BED_BUG_TREATMENT: "Bed Bug Treatment",
  RODENT_INSPECTION: "Rodent Inspection",
  GENERAL_PEST_INSPECTION: "General Pest Inspection",
  FOLLOW_UP: "Follow-Up",
  OTHER: "Other",
};

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const orgId = user.organizationId;
  const now = new Date();
  const { period = "30d" } = await searchParams;

  const periodDays = period === "ytd" ? null : period === "90d" ? 90 : 30;
  const periodStart = periodDays
    ? new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear(), 0, 1);
  const prevStart = periodDays
    ? new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000)
    : new Date(now.getFullYear() - 1, 0, 1);

  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalInspections,
    inspectionsThisPeriod,
    inspectionsLastPeriod,
    positiveCount,
    revenueThisPeriod,
    revenueLastPeriod,
    revenueYTD,
    openInvoices,
    topCustomers,
    resultBreakdown,
    serviceBreakdown,
    techStats,
    monthlyInspections,
  ] = await Promise.all([
    prisma.inspection.count({ where: { organizationId: orgId } }),

    prisma.inspection.count({
      where: { organizationId: orgId, createdAt: { gte: periodStart } },
    }),
    prisma.inspection.count({
      where: { organizationId: orgId, createdAt: { gte: prevStart, lt: periodStart } },
    }),

    prisma.inspection.count({
      where: {
        organizationId: orgId,
        overallResult: { in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"] },
      },
    }),

    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: periodStart } },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: prevStart, lt: periodStart } },
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
        _count: { select: { appointments: true } },
        invoices: { where: { status: "PAID" }, select: { paidAmount: true } },
      },
      orderBy: { appointments: { _count: "desc" } },
      take: 5,
    }),

    prisma.inspection.groupBy({
      by: ["overallResult"],
      where: { organizationId: orgId, overallResult: { not: null } },
      _count: true,
    }),

    prisma.appointment.groupBy({
      by: ["serviceType"],
      where: { organizationId: orgId, createdAt: { gte: periodStart } },
      _count: true,
    }),

    prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: { select: { assignedAppointments: true } },
      },
      orderBy: { assignedAppointments: { _count: "desc" } },
      take: 8,
    }),

    prisma.inspection.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Build 6-month bar data
  const monthBuckets: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({
      label: d.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    });
  }
  for (const insp of monthlyInspections) {
    const monthIdx = (insp.createdAt.getFullYear() - now.getFullYear()) * 12 +
      insp.createdAt.getMonth() - (now.getMonth() - 5);
    if (monthIdx >= 0 && monthIdx < 6) monthBuckets[monthIdx].count++;
  }
  const maxMonthCount = Math.max(...monthBuckets.map((b) => b.count), 1);

  const positiveRatePercent = totalInspections > 0
    ? ((positiveCount / totalInspections) * 100).toFixed(1)
    : "0.0";

  const thisPeriodRevenue = Number(revenueThisPeriod._sum.paidAmount ?? 0);
  const lastPeriodRevenue = Number(revenueLastPeriod._sum.paidAmount ?? 0);

  const delta = (curr: number, prev: number) =>
    prev > 0 ? (((curr - prev) / prev) * 100).toFixed(0) : curr > 0 ? "100" : "0";

  const totalResults = resultBreakdown.reduce((s, r) => s + r._count, 0);
  const totalServiceAppts = serviceBreakdown.reduce((s, r) => s + r._count, 0);

  const PERIODS = [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "ytd", label: "Year to Date" },
  ];

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "30 Days";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Business performance overview</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/analytics?period=${p.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Inspections ({periodLabel})
          </div>
          <div className="text-3xl font-bold text-foreground">{inspectionsThisPeriod}</div>
          <div className={`text-xs mt-1 ${parseInt(delta(inspectionsThisPeriod, inspectionsLastPeriod)) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {parseInt(delta(inspectionsThisPeriod, inspectionsLastPeriod)) >= 0 ? "+" : ""}
            {delta(inspectionsThisPeriod, inspectionsLastPeriod)}% vs prior period
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Revenue ({periodLabel})
          </div>
          <div className="text-3xl font-bold text-foreground">{formatCurrency(thisPeriodRevenue)}</div>
          <div className={`text-xs mt-1 ${parseInt(delta(thisPeriodRevenue, lastPeriodRevenue)) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {parseInt(delta(thisPeriodRevenue, lastPeriodRevenue)) >= 0 ? "+" : ""}
            {delta(thisPeriodRevenue, lastPeriodRevenue)}% vs prior period
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

      {/* Monthly Trend — fixed bar chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
          Inspections — Last 6 Months
        </h2>
        <div className="flex items-end gap-3 h-36">
          {monthBuckets.map(({ label, count }) => {
            const heightPct = (count / maxMonthCount) * 100;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium text-foreground">{count > 0 ? count : ""}</span>
                <div className="w-full flex items-end" style={{ height: "96px" }}>
                  <div
                    className="w-full bg-primary rounded-t-md transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Results */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Detection Results
            </h2>
            <span className="text-xs text-muted-foreground">
              Positive rate: <span className="font-semibold text-foreground">{positiveRatePercent}%</span>
            </span>
          </div>
          {totalResults === 0 ? (
            <p className="text-sm text-muted-foreground">No inspections recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {resultBreakdown
                .sort((a, b) => b._count - a._count)
                .map((r) => {
                  const pct = (r._count / totalResults) * 100;
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
          )}
        </div>

        {/* Service Type Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Service Types ({periodLabel})
          </h2>
          {totalServiceAppts === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments this period.</p>
          ) : (
            <div className="space-y-3">
              {serviceBreakdown
                .sort((a, b) => b._count - a._count)
                .map((s) => {
                  const pct = (s._count / totalServiceAppts) * 100;
                  return (
                    <div key={s.serviceType}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">
                          {SERVICE_LABELS[s.serviceType] ?? s.serviceType.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {s._count} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%`, opacity: 0.6 + (pct / 100) * 0.4 }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Top Customers
          </h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                const lifetime = c.invoices.reduce((s, inv) => s + Number(inv.paidAmount), 0);
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.companyName ?? `${c.firstName} ${c.lastName}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c._count.appointments} appointments
                      </div>
                    </div>
                    <div className="text-sm font-medium text-foreground shrink-0">
                      {formatCurrency(lifetime)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Technician Performance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Technician Activity
          </h2>
          {techStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No technicians found.</p>
          ) : (
            <div className="space-y-3">
              {techStats.map((tech, i) => {
                const maxJobs = techStats[0]._count.assignedAppointments || 1;
                const pct = (tech._count.assignedAppointments / maxJobs) * 100;
                return (
                  <div key={tech.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{tech.firstName} {tech.lastName}</span>
                      <span className="text-muted-foreground">{tech._count.assignedAppointments} jobs</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%`, opacity: i === 0 ? 1 : 0.5 + (pct / 200) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pb-4">
        Total inspections all time: {totalInspections}
      </div>
    </div>
  );
}
