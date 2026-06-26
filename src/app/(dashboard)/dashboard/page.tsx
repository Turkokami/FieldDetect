import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/stats-cards";
import { RecentAppointments } from "@/components/dashboard/recent-appointments";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  EN_ROUTE: "bg-purple-100 text-purple-700",
  ON_SITE: "bg-indigo-100 text-indigo-700",
  INSPECTION_STARTED: "bg-amber-100 text-amber-700",
  INSPECTION_COMPLETE: "bg-green-100 text-green-700",
};

const RESULT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  NEGATIVE: { label: "Negative", color: "#16a34a", bg: "#dcfce7" },
  POSITIVE_K9_ALERT: { label: "K9 Alert", color: "#dc2626", bg: "#fee2e2" },
  VISUAL_CONFIRMATION: { label: "Visual +", color: "#b91c1c", bg: "#fecaca" },
  INCONCLUSIVE: { label: "Inconclusive", color: "#ca8a04", bg: "#fef9c3" },
  UNABLE_TO_INSPECT: { label: "No Access", color: "#64748b", bg: "#f1f5f9" },
  ACCESS_DENIED: { label: "Denied", color: "#475569", bg: "#f1f5f9" },
  FOLLOW_UP_REQUIRED: { label: "Follow-Up", color: "#ea580c", bg: "#ffedd5" },
};

async function getDashboardData(organizationId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    inspectionsThisMonth,
    positiveInspections,
    revenueData,
    unpaidInvoices,
    upcomingCount,
    pendingReports,
    followUpJobs,
    todayAppointments,
    recentAppointments,
    recentInvoices,
    detectionBreakdown,
    activePositives,
    technicianStats,
  ] = await Promise.all([
    prisma.inspection.count({
      where: { organizationId, startTime: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.inspection.count({
      where: {
        organizationId,
        startTime: { gte: monthStart, lte: monthEnd },
        totalPositive: { gt: 0 },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        createdAt: { gte: monthStart, lte: monthEnd },
        status: { in: ["PAID", "PARTIALLY_PAID"] },
      },
      _sum: { paidAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      _sum: { balanceDue: true },
    }),
    prisma.appointment.count({
      where: {
        organizationId,
        scheduledDate: { gte: now },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    }),
    prisma.inspection.count({
      where: { organizationId, endTime: { not: null }, reportGeneratedAt: null },
    }),
    prisma.inspection.count({
      where: { organizationId, followUpRequired: true, invoice: null },
    }),
    // Today's schedule
    prisma.appointment.findMany({
      where: {
        organizationId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
    // Upcoming (not today)
    prisma.appointment.findMany({
      where: {
        organizationId,
        scheduledDate: { gte: now },
        status: { in: ["SCHEDULED", "CONFIRMED", "EN_ROUTE"] },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true, state: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Detection results breakdown this month
    prisma.inspectionUnit.groupBy({
      by: ["detectionResult"],
      where: {
        inspection: {
          organizationId,
          startTime: { gte: monthStart, lte: monthEnd },
        },
      },
      _count: true,
    }),
    // Active alerts: positive units this month
    prisma.inspectionUnit.count({
      where: {
        inspection: { organizationId, startTime: { gte: monthStart } },
        detectionResult: { in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"] },
      },
    }),
    // Technician stats this month
    prisma.inspection.groupBy({
      by: ["technicianId"],
      where: { organizationId, startTime: { gte: monthStart, lte: monthEnd } },
      _count: true,
      orderBy: { _count: { technicianId: "desc" } },
      take: 5,
    }),
  ]);

  const techIds = technicianStats.map((t) => t.technicianId);
  const techUsers = techIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: techIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const techMap = Object.fromEntries(techUsers.map((u) => [u.id, u]));

  return {
    totalInspectionsThisMonth: inspectionsThisMonth,
    positiveDetectionRate:
      inspectionsThisMonth > 0
        ? Math.round((positiveInspections / inspectionsThisMonth) * 100)
        : 0,
    revenueThisMonth: revenueData._sum.paidAmount ?? 0,
    unpaidInvoicesTotal: unpaidInvoices._sum.balanceDue ?? 0,
    upcomingAppointmentsCount: upcomingCount,
    pendingReportsCount: pendingReports,
    followUpJobsCount: followUpJobs,
    todayAppointments,
    recentAppointments,
    recentInvoices,
    detectionBreakdown,
    activePositives,
    technicianStats: technicianStats.map((t) => ({
      user: techMap[t.technicianId],
      count: t._count,
    })),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const now30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [data, k9TeamCount, propertyCount, appointmentCount, expiringCerts] = await Promise.all([
    getDashboardData(user.organizationId),
    prisma.k9Team.count({ where: { organizationId: user.organizationId, isActive: true } }),
    prisma.property.count({ where: { organizationId: user.organizationId, isActive: true } }),
    prisma.appointment.count({ where: { organizationId: user.organizationId } }),
    prisma.handlerCertification.findMany({
      where: {
        AND: [
          { expiresAt: { not: null } },
          { expiresAt: { lte: now30 } },
          { user: { organizationId: user.organizationId, isActive: true } },
        ],
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { expiresAt: "asc" },
      take: 10,
    }).catch((e) => { console.error("[DASHBOARD] cert query failed:", e); return []; }),
  ]);

  const today = new Date();
  const totalUnitResults = data.detectionBreakdown.reduce((s, d) => s + d._count, 0);

  const activeToday = data.todayAppointments.filter(
    (a) => ["EN_ROUTE", "ON_SITE", "INSPECTION_STARTED"].includes(a.status)
  );
  const completedToday = data.todayAppointments.filter(
    (a) => a.status === "INSPECTION_COMPLETE"
  );

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"}, {user.firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(today, "EEEE, MMMM d, yyyy")} · {data.todayAppointments.length} jobs today
          </p>
        </div>
        {activeToday.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"
            style={{ background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            {activeToday.length} job{activeToday.length > 1 ? "s" : ""} in progress
          </div>
        )}
      </div>

      <QuickActions />

      <GettingStarted
        hasK9Team={k9TeamCount > 0}
        hasProperty={propertyCount > 0}
        hasAppointment={appointmentCount > 0}
        orgId={user.organizationId}
      />

      {/* KPI row */}
      <DashboardStats
        totalInspectionsThisMonth={data.totalInspectionsThisMonth}
        positiveDetectionRate={data.positiveDetectionRate}
        revenueThisMonth={Number(data.revenueThisMonth)}
        unpaidInvoicesTotal={Number(data.unpaidInvoicesTotal)}
        upcomingAppointmentsCount={data.upcomingAppointmentsCount}
        pendingReportsCount={data.pendingReportsCount}
        followUpJobsCount={data.followUpJobsCount}
      />

      {/* Today's Schedule + Detection Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's Schedule — 2 cols */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Today&apos;s Schedule</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.todayAppointments.length} job{data.todayAppointments.length !== 1 ? "s" : ""}
                {completedToday.length > 0 ? ` · ${completedToday.length} complete` : ""}
              </p>
            </div>
            <Link href="/scheduling" className="text-xs font-medium hover:underline"
              style={{ color: "#0ABAB5" }}>
              Full calendar →
            </Link>
          </div>
          {data.todayAppointments.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground text-sm">
              <div className="text-2xl mb-2">📅</div>
              No appointments scheduled for today
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.todayAppointments.map((appt) => {
                const isActive = ["EN_ROUTE", "ON_SITE", "INSPECTION_STARTED"].includes(appt.status);
                return (
                  <Link
                    key={appt.id}
                    href={`/scheduling/${appt.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-center shrink-0 w-12">
                      <div className="text-xs font-bold text-foreground">
                        {format(new Date(appt.scheduledDate), "h:mm")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(appt.scheduledDate), "a")}
                      </div>
                    </div>
                    <div className={`w-1 h-10 rounded-full shrink-0 ${isActive ? "bg-purple-400 animate-pulse" : appt.status === "INSPECTION_COMPLETE" ? "bg-green-400" : "bg-border"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {appt.customer.companyName ?? `${appt.customer.firstName} ${appt.customer.lastName}`}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {appt.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {appt.property.name} · {appt.property.city}
                      </div>
                      {appt.technician && (
                        <div className="text-[10px] text-muted-foreground">
                          {appt.technician.firstName} {appt.technician.lastName}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <Link
                        href={`/field/${appt.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] px-2 py-1 rounded-lg font-semibold text-white shrink-0"
                        style={{ background: "#0ABAB5" }}
                      >
                        Field View
                      </Link>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Detection Analytics — 1 col */}
        <div className="space-y-4">

          {/* Active Alerts */}
          {data.activePositives > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
                🚨 Active Alerts This Month
              </div>
              <div className="text-3xl font-black text-red-600">{data.activePositives}</div>
              <div className="text-xs text-red-400 mt-1">positive detection{data.activePositives > 1 ? "s" : ""} confirmed</div>
            </div>
          )}

          {/* Unit Results Breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Unit Results This Month
            </h2>
            {data.detectionBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No inspection data this month</p>
            ) : (
              <div className="space-y-2.5">
                {[...data.detectionBreakdown]
                  .sort((a, b) => b._count - a._count)
                  .map((d) => {
                    const cfg = RESULT_CONFIG[d.detectionResult] ?? { label: d.detectionResult, color: "#64748b", bg: "#f1f5f9" };
                    const pct = totalUnitResults > 0 ? (d._count / totalUnitResults) * 100 : 0;
                    return (
                      <div key={d.detectionResult}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{cfg.label}</span>
                          <span className="text-muted-foreground">{d._count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  {totalUnitResults} total units inspected
                </div>
              </div>
            )}
          </div>

          {/* Technician Performance */}
          {data.technicianStats.filter((t) => t.user).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Technician Activity
              </h2>
              <div className="space-y-2.5">
                {data.technicianStats.filter((t) => t.user).map((t) => (
                  <div key={t.user.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "#0ABAB5" }}>
                      {t.user.firstName[0]}{t.user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {t.user.firstName} {t.user.lastName}
                      </div>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.min((t.count / Math.max(...data.technicianStats.map((x) => x.count))) * 100, 100)}%`,
                          background: "#0ABAB5",
                        }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-foreground shrink-0">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Handler Cert Alerts */}
      {expiringCerts.length > 0 && (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: "rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.04)" }}>
          <div className="px-5 py-3 flex items-center justify-between border-b"
            style={{ borderColor: "rgba(220,38,38,0.15)" }}>
            <div className="text-sm font-semibold" style={{ color: "#dc2626" }}>
              ⚠️ Handler Certifications Expiring
            </div>
            <Link href="/team" className="text-xs font-medium" style={{ color: "#dc2626" }}>
              Manage →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(220,38,38,0.1)" }}>
            {expiringCerts.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href={`/team/handlers/${c.user.id}`}
                      className="text-sm font-medium text-foreground hover:underline shrink-0">
                      {c.user.firstName} {c.user.lastName}
                    </Link>
                    <span className="text-sm text-muted-foreground truncate">— {c.name}</span>
                  </div>
                  <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full"
                    style={expired
                      ? { background: "rgba(220,38,38,0.1)", color: "#dc2626" }
                      : { background: "rgba(202,138,4,0.1)", color: "#ca8a04" }}>
                    {expired ? "Expired" : "Expiring Soon"}
                    {c.expiresAt && ` · ${new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAppointments appointments={data.recentAppointments} />
        <RecentInvoices invoices={data.recentInvoices} />
      </div>
    </div>
  );
}
