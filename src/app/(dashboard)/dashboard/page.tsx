import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardStats } from "@/components/dashboard/stats-cards";
import { RecentAppointments } from "@/components/dashboard/recent-appointments";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { startOfMonth, endOfMonth } from "date-fns";

export const metadata = { title: "Dashboard" };

async function getDashboardData(organizationId: string) {
  const now = new Date();
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
    recentAppointments,
    recentInvoices,
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
      take: 6,
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
      take: 6,
    }),
  ]);

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
    recentAppointments,
    recentInvoices,
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const data = await getDashboardData(user.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening with your inspections today.
        </p>
      </div>

      <QuickActions />

      <DashboardStats
        totalInspectionsThisMonth={data.totalInspectionsThisMonth}
        positiveDetectionRate={data.positiveDetectionRate}
        revenueThisMonth={data.revenueThisMonth}
        unpaidInvoicesTotal={data.unpaidInvoicesTotal}
        upcomingAppointmentsCount={data.upcomingAppointmentsCount}
        pendingReportsCount={data.pendingReportsCount}
        followUpJobsCount={data.followUpJobsCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAppointments appointments={data.recentAppointments} />
        <RecentInvoices invoices={data.recentInvoices} />
      </div>
    </div>
  );
}
