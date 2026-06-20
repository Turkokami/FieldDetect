import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const orgId = user.organizationId;
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
        where: {
          organizationId: orgId,
          startTime: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.inspection.count({
        where: {
          organizationId: orgId,
          startTime: { gte: monthStart, lte: monthEnd },
          totalPositive: { gt: 0 },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ["PAID", "PARTIALLY_PAID"] },
        },
        _sum: { paidAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        _sum: { balanceDue: true },
      }),
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          scheduledDate: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
      }),
      prisma.inspection.count({
        where: {
          organizationId: orgId,
          endTime: { not: null },
          reportGeneratedAt: null,
        },
      }),
      prisma.inspection.count({
        where: {
          organizationId: orgId,
          followUpRequired: true,
          invoice: null,
        },
      }),
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
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
          organizationId: orgId,
          status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          customer: { select: { firstName: true, lastName: true, companyName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const positiveDetectionRate =
      inspectionsThisMonth > 0
        ? Math.round((positiveInspections / inspectionsThisMonth) * 100)
        : 0;

    return NextResponse.json({
      data: {
        totalInspectionsThisMonth: inspectionsThisMonth,
        positiveDetectionRate,
        revenueThisMonth: revenueData._sum.paidAmount ?? 0,
        unpaidInvoicesTotal: unpaidInvoices._sum.balanceDue ?? 0,
        upcomingAppointmentsCount: upcomingCount,
        pendingReportsCount: pendingReports,
        followUpJobsCount: followUpJobs,
        recentAppointments,
        recentInvoices,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
