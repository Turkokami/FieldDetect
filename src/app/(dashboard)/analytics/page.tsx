import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

const RESULT_COLOR_MAP: Record<string, { bar: string; text: string }> = {
  NEGATIVE:            { bar: "#16a34a", text: "text-green-600" },
  POSITIVE_K9_ALERT:   { bar: "#dc2626", text: "text-red-600" },
  VISUAL_CONFIRMATION: { bar: "#ef4444", text: "text-red-500" },
  INCONCLUSIVE:        { bar: "#ca8a04", text: "text-yellow-600" },
  UNABLE_TO_INSPECT:   { bar: "#94a3b8", text: "text-slate-500" },
  ACCESS_DENIED:       { bar: "#f97316", text: "text-orange-500" },
  FOLLOW_UP_REQUIRED:  { bar: "#3b82f6", text: "text-blue-500" },
};

const APPT_STATUS_ORDER = [
  "REQUESTED", "SCHEDULED", "CONFIRMED", "EN_ROUTE", "ON_SITE",
  "INSPECTION_STARTED", "INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID",
];

const APPT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Requested", SCHEDULED: "Scheduled", CONFIRMED: "Confirmed",
  EN_ROUTE: "En Route", ON_SITE: "On Site", INSPECTION_STARTED: "In Progress",
  INSPECTION_COMPLETE: "Complete", REPORT_SENT: "Report Sent",
  INVOICED: "Invoiced", PAID: "Paid",
  CANCELLED: "Cancelled", NO_SHOW: "No Show",
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
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    inspectionsThisPeriod,
    inspectionsLastPeriod,
    positiveCount,
    totalInspections,
    followUpCount,
    revenueThisPeriod,
    revenueLastPeriod,
    revenueYTD,
    openInvoices,
    overdueInvoices,
    avgInvoiceValue,
    topCustomers,
    resultBreakdown,
    serviceBreakdown,
    apptStatusBreakdown,
    techStats,
    k9DogStats,
    monthlyInspections,
    monthlyRevenue,
  ] = await Promise.all([
    prisma.inspection.count({
      where: { organizationId: orgId, createdAt: { gte: periodStart } },
    }),
    prisma.inspection.count({
      where: { organizationId: orgId, createdAt: { gte: prevStart, lt: periodStart } },
    }),

    prisma.inspection.count({
      where: { organizationId: orgId, overallResult: { in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"] } },
    }),
    prisma.inspection.count({ where: { organizationId: orgId } }),

    prisma.inspection.count({
      where: { organizationId: orgId, followUpRequired: true },
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
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: "OVERDUE" },
      select: { dueDate: true, balanceDue: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: periodStart } },
      _avg: { totalAmount: true },
    }),

    prisma.customer.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { appointments: true } },
        invoices: { where: { status: "PAID" }, select: { paidAmount: true } },
      },
      orderBy: { invoices: { _count: "desc" } },
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

    prisma.appointment.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),

    prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] }, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedAppointments: {
          where: { createdAt: { gte: periodStart } },
          select: { id: true },
        },
        _count: { select: { assignedAppointments: true } },
      },
      orderBy: { assignedAppointments: { _count: "desc" } },
      take: 8,
    }),

    prisma.k9Dog.findMany({
      where: { k9Team: { organizationId: orgId }, isActive: true },
      select: {
        id: true,
        name: true,
        breed: true,
        _count: { select: { inspections: true } },
      },
      orderBy: { inspections: { _count: "desc" } },
      take: 6,
    }),

    prisma.inspection.findMany({
      where: { organizationId: orgId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, status: "PAID", paidAt: { gte: sixMonthsAgo } },
      select: { paidAt: true, paidAmount: true },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  // ── Build 6-month trend buckets ───────────────────────────────────────────
  const monthBuckets: { label: string; count: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ label: d.toLocaleDateString("en-US", { month: "short" }), count: 0, revenue: 0 });
  }
  for (const insp of monthlyInspections) {
    const idx = (insp.createdAt.getFullYear() - now.getFullYear()) * 12 +
      insp.createdAt.getMonth() - (now.getMonth() - 5);
    if (idx >= 0 && idx < 6) monthBuckets[idx].count++;
  }
  for (const inv of monthlyRevenue) {
    if (!inv.paidAt) continue;
    const idx = (inv.paidAt.getFullYear() - now.getFullYear()) * 12 +
      inv.paidAt.getMonth() - (now.getMonth() - 5);
    if (idx >= 0 && idx < 6) monthBuckets[idx].revenue += Number(inv.paidAmount ?? 0);
  }
  const maxCount = Math.max(...monthBuckets.map((b) => b.count), 1);
  const maxRevenue = Math.max(...monthBuckets.map((b) => b.revenue), 1);

  // ── Invoice aging buckets ─────────────────────────────────────────────────
  const aging = { lt30: 0, d30: 0, d60: 0, gt90: 0 };
  for (const inv of overdueInvoices) {
    if (!inv.dueDate) { aging.lt30 += Number(inv.balanceDue); continue; }
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
    if (days < 30) aging.lt30 += Number(inv.balanceDue);
    else if (days < 60) aging.d30 += Number(inv.balanceDue);
    else if (days < 90) aging.d60 += Number(inv.balanceDue);
    else aging.gt90 += Number(inv.balanceDue);
  }
  const totalAging = aging.lt30 + aging.d30 + aging.d60 + aging.gt90;

  // ── Appointment pipeline (active statuses only) ───────────────────────────
  const statusMap = new Map<string, number>();
  for (const s of apptStatusBreakdown) statusMap.set(s.status, s._count);
  const activeStatuses = APPT_STATUS_ORDER.filter((s) => (statusMap.get(s) ?? 0) > 0);

  // ── Derived metrics ───────────────────────────────────────────────────────
  const thisPeriodRevenue = Number(revenueThisPeriod._sum.paidAmount ?? 0);
  const lastPeriodRevenue = Number(revenueLastPeriod._sum.paidAmount ?? 0);
  const positiveRate = totalInspections > 0 ? ((positiveCount / totalInspections) * 100).toFixed(1) : "0.0";
  const followUpRate = totalInspections > 0 ? ((followUpCount / totalInspections) * 100).toFixed(1) : "0.0";
  const avgJobValue = Number(avgInvoiceValue._avg.totalAmount ?? 0);
  const totalResults = resultBreakdown.reduce((s, r) => s + r._count, 0);
  const totalServiceAppts = serviceBreakdown.reduce((s, r) => s + r._count, 0);

  const delta = (curr: number, prev: number): number =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
  const pctChange = (n: number) => (n >= 0 ? `+${n}%` : `${n}%`);

  const PERIODS = [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "ytd", label: "Year to Date" },
  ];
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "30 Days";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title + period selector */}
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

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: `Inspections (${periodLabel})`,
            value: inspectionsThisPeriod,
            change: delta(inspectionsThisPeriod, inspectionsLastPeriod),
            sub: `${inspectionsLastPeriod} prior period`,
            format: "number",
          },
          {
            label: `Revenue (${periodLabel})`,
            value: thisPeriodRevenue,
            change: delta(thisPeriodRevenue, lastPeriodRevenue),
            sub: `${formatCurrency(lastPeriodRevenue)} prior period`,
            format: "currency",
          },
          {
            label: "Revenue YTD",
            value: Number(revenueYTD._sum.paidAmount ?? 0),
            change: null,
            sub: "Since Jan 1",
            format: "currency",
          },
          {
            label: "Outstanding",
            value: Number(openInvoices._sum.balanceDue ?? 0),
            change: null,
            sub: `${openInvoices._count} open invoices`,
            format: "currency",
            danger: true,
          },
        ].map(({ label, value, change, sub, format, danger }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</div>
            <div className={`text-3xl font-bold ${danger ? "text-destructive" : "text-foreground"}`}>
              {format === "currency" ? formatCurrency(value as number) : value}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {change !== null ? (
                <>
                  {change > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : change < 0 ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={`text-xs font-medium ${change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {pctChange(change)}
                  </span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{sub}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{positiveRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Positive Detection Rate</div>
          <div className="text-xs text-muted-foreground">{positiveCount} of {totalInspections} inspections</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{followUpRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Follow-Up Rate</div>
          <div className="text-xs text-muted-foreground">{followUpCount} inspections flagged</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{formatCurrency(avgJobValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">Avg Job Value</div>
          <div className="text-xs text-muted-foreground">({periodLabel})</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{totalInspections}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Inspections</div>
          <div className="text-xs text-muted-foreground">All time</div>
        </div>
      </div>

      {/* ── 6-Month Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inspections chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
            Inspections — Last 6 Months
          </h2>
          <div className="flex items-end gap-3 h-40">
            {monthBuckets.map(({ label, count }) => {
              const pct = (count / maxCount) * 100;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{count > 0 ? count : ""}</span>
                  <div className="w-full flex items-end" style={{ height: "100px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, 2)}%`, background: "linear-gradient(180deg, #0ABAB5, #0D9488)" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">
            Revenue (Collected) — Last 6 Months
          </h2>
          <div className="flex items-end gap-3 h-40">
            {monthBuckets.map(({ label, revenue }) => {
              const pct = (revenue / maxRevenue) * 100;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">
                    {revenue > 0 ? `$${Math.round(revenue / 1000) > 0 ? Math.round(revenue / 1000) + "k" : Math.round(revenue)}` : ""}
                  </span>
                  <div className="w-full flex items-end" style={{ height: "100px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, revenue > 0 ? 2 : 0)}%`, background: "linear-gradient(180deg, #6366f1, #4f46e5)" }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Detection results + service breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Detection Results</h2>
            <span className="text-xs text-muted-foreground">
              Positive rate: <span className="font-semibold text-foreground">{positiveRate}%</span>
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
                  const colors = RESULT_COLOR_MAP[r.overallResult ?? ""] ?? { bar: "#94a3b8", text: "text-muted-foreground" };
                  return (
                    <div key={r.overallResult}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">
                          {RESULT_LABELS[r.overallResult ?? ""] ?? r.overallResult?.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground">{r._count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.bar }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

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
                .map((s, i) => {
                  const pct = (s._count / totalServiceAppts) * 100;
                  const opacity = 1 - i * 0.12;
                  return (
                    <div key={s.serviceType}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{SERVICE_LABELS[s.serviceType] ?? s.serviceType.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{s._count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%`, opacity }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Appointment pipeline + Invoice aging ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment pipeline */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Appointment Pipeline
          </h2>
          {activeStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments found.</p>
          ) : (
            <div className="space-y-2.5">
              {activeStatuses.map((status) => {
                const count = statusMap.get(status) ?? 0;
                const total = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const isPaid = status === "PAID";
                const isComplete = status === "INSPECTION_COMPLETE" || status === "REPORT_SENT";
                const color = isPaid ? "#16a34a" : isComplete ? "#0ABAB5" : "#6366f1";
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{APPT_STATUS_LABELS[status] ?? status.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice aging */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Overdue Invoice Aging
          </h2>
          {totalAging === 0 ? (
            <p className="text-sm text-muted-foreground">No overdue invoices.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "< 30 days overdue", amount: aging.lt30, color: "#ca8a04" },
                { label: "30–60 days", amount: aging.d30, color: "#ea580c" },
                { label: "60–90 days", amount: aging.d60, color: "#dc2626" },
                { label: "90+ days", amount: aging.gt90, color: "#991b1b" },
              ].filter((b) => b.amount > 0).map(({ label, amount, color }) => {
                const pct = (amount / totalAging) * 100;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground">{label}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-1 border-t border-border flex justify-between text-sm font-semibold">
                <span className="text-foreground">Total Overdue</span>
                <span className="text-destructive">{formatCurrency(totalAging)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top customers + Technician stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Top Customers (by Revenue)
          </h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topCustomers.map((c, i) => {
                const lifetime = c.invoices.reduce((s, inv) => s + Number(inv.paidAmount), 0);
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1.5 -mx-1.5 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: i === 0 ? "linear-gradient(135deg, #0ABAB5, #0D9488)" : undefined }}
                    >
                      {i === 0
                        ? <span>{i + 1}</span>
                        : <span className="text-muted-foreground">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {c.companyName ?? `${c.firstName} ${c.lastName}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c._count.appointments} appointments
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground shrink-0">
                      {formatCurrency(lifetime)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1 uppercase tracking-wide">
            Technician Activity
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Jobs this period · all time in brackets</p>
          {techStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No technicians found.</p>
          ) : (
            <div className="space-y-3">
              {techStats
                .map((t) => ({ ...t, periodJobs: t.assignedAppointments.length }))
                .sort((a, b) => b.periodJobs - a.periodJobs)
                .map((tech) => {
                  const maxJobs = Math.max(...techStats.map((t) => t.assignedAppointments.length), 1);
                  const pct = maxJobs > 0 ? (tech.periodJobs / maxJobs) * 100 : 0;
                  return (
                    <div key={tech.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{tech.firstName} {tech.lastName}</span>
                        <span className="text-muted-foreground">
                          {tech.periodJobs} <span className="text-xs opacity-60">({tech._count.assignedAppointments} all time)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(pct, tech.periodJobs > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── K9 Dog Performance ── */}
      {k9DogStats.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            K9 Dog Performance (All Time)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {k9DogStats.map((dog, i) => (
              <div
                key={dog.id}
                className="rounded-xl border border-border p-4 text-center"
                style={i === 0 ? { borderColor: "rgba(10,186,181,0.4)", background: "rgba(10,186,181,0.05)" } : undefined}
              >
                <div className="text-2xl font-bold text-foreground">{dog._count.inspections}</div>
                <div className="text-sm font-semibold text-foreground mt-1 truncate">{dog.name}</div>
                {dog.breed && <div className="text-xs text-muted-foreground truncate">{dog.breed}</div>}
                <div className="text-xs text-muted-foreground mt-0.5">inspections</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
