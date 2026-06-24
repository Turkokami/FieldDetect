import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import RoutesClient from "@/components/routes/routes-client";

export const metadata = { title: "Routes" };

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { view = "week" } = await searchParams;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const dateRange = view === "today"
    ? { gte: todayStart, lt: todayEnd }
    : { gte: todayStart, lt: weekEnd };

  const [appointments, technicians] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        scheduledDate: dateRange,
        status: { notIn: ["CANCELLED", "NO_SHOW", "INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID"] },
      },
      select: {
        id: true,
        status: true,
        serviceType: true,
        scheduledDate: true,
        estimatedMinutes: true,
        routeOrder: true,
        priority: true,
        property: { select: { name: true, addressLine1: true, city: true, state: true, zip: true } },
        customer: { select: { firstName: true, lastName: true } },
        technician: { select: { id: true, firstName: true, lastName: true } },
        k9Team: { select: { name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { routeOrder: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const totalStops = appointments.length;
  const techCount = new Set(appointments.map((a) => a.technician?.id ?? "unassigned")).size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalStops} stop{totalStops !== 1 ? "s" : ""}
            {" "}· {techCount} technician{techCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Link
              href="/routes?view=week"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "week"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              This Week
            </Link>
            <Link
              href="/routes?view=today"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "today"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today Only
            </Link>
          </div>
          <Link
            href="/scheduling/new"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + New Appointment
          </Link>
        </div>
      </div>

      <RoutesClient
        initialAppointments={JSON.parse(JSON.stringify(appointments))}
        technicians={JSON.parse(JSON.stringify(technicians))}
        view={view}
      />
    </div>
  );
}
