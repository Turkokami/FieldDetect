import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Routes" };

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "Bed Bug Inspection",
  BED_BUG_TREATMENT: "Bed Bug Treatment",
  RODENT_INSPECTION: "Rodent Inspection",
  GENERAL_PEST_INSPECTION: "General Pest Inspection",
  FOLLOW_UP: "Follow-Up",
  OTHER: "Service Call",
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  EN_ROUTE: "bg-purple-100 text-purple-700",
  ON_SITE: "bg-indigo-100 text-indigo-700",
  INSPECTION_STARTED: "bg-amber-100 text-amber-700",
  INVOICED: "bg-slate-100 text-slate-600",
};

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { view = "today" } = await searchParams;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const dateRange = view === "week"
    ? { gte: todayStart, lt: weekEnd }
    : { gte: todayStart, lt: todayEnd };

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      scheduledDate: dateRange,
      status: { notIn: ["CANCELLED", "NO_SHOW", "INSPECTION_COMPLETE"] },
    },
    include: {
      property: { select: { name: true, addressLine1: true, city: true, state: true, zip: true } },
      customer: { select: { firstName: true, lastName: true } },
      technician: { select: { id: true, firstName: true, lastName: true } },
      k9Team: { select: { name: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { routeOrder: "asc" }],
  });

  // Group by technician, then by day within each technician
  type Appt = typeof appointments[number];
  const byTech: Map<string, { name: string; appts: Appt[] }> = new Map();

  for (const appt of appointments) {
    const key = appt.technician
      ? `${appt.technician.firstName} ${appt.technician.lastName}`
      : "Unassigned";
    if (!byTech.has(key)) byTech.set(key, { name: key, appts: [] });
    byTech.get(key)!.appts.push(appt);
  }

  const techGroups = Array.from(byTech.values());

  function groupByDay(appts: Appt[]): Map<string, Appt[]> {
    const map = new Map<string, Appt[]>();
    for (const a of appts) {
      const label = a.scheduledDate.toLocaleDateString("en-US", {
        weekday: "long", month: "short", day: "numeric",
      });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(a);
    }
    return map;
  }

  function mapsUrl(appt: Appt) {
    const addr = `${appt.property.addressLine1}, ${appt.property.city}, ${appt.property.state} ${appt.property.zip ?? ""}`.trim();
    return `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
  }

  const isToday = (d: Date) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const dt = new Date(d); dt.setHours(0, 0, 0, 0);
    return t.getTime() === dt.getTime();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appointments.length} stop{appointments.length !== 1 ? "s" : ""}
            {" "}· {techGroups.length} technician{techGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Link
              href="/routes?view=today"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "today"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </Link>
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
          </div>
          <Link
            href="/scheduling/new"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + New Appointment
          </Link>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📍</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No appointments {view === "today" ? "today" : "this week"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Schedule appointments to see routes here.
          </p>
          <Link
            href="/scheduling/new"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Schedule an Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {techGroups.map(({ name: techName, appts }) => {
            const dayGroups = groupByDay(appts);
            const initials = techName === "Unassigned"
              ? "?"
              : techName.split(" ").map((n) => n[0]).join("");

            return (
              <div key={techName} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tech header */}
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {initials}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground text-sm">{techName}</span>
                      {appts[0].k9Team && (
                        <span className="ml-2 text-xs text-muted-foreground">· 🐕 {appts[0].k9Team.name}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{appts.length} stop{appts.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Day groups */}
                {Array.from(dayGroups.entries()).map(([dayLabel, dayAppts]) => (
                  <div key={dayLabel}>
                    {/* Day separator for week view */}
                    {view === "week" && (
                      <div className={`px-5 py-1.5 text-xs font-semibold border-b border-border/50 ${
                        isToday(dayAppts[0].scheduledDate)
                          ? "bg-primary/5 text-primary"
                          : "bg-muted/20 text-muted-foreground"
                      }`}>
                        {isToday(dayAppts[0].scheduledDate) ? "Today — " : ""}{dayLabel}
                      </div>
                    )}

                    <div className="divide-y divide-border/50">
                      {dayAppts.map((appt, idx) => {
                        const stopNum = appts.indexOf(appt) + 1;
                        const isLast = idx === dayAppts.length - 1;
                        return (
                          <div key={appt.id} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                            {/* Timeline spine */}
                            <div className="flex flex-col items-center pt-0.5 shrink-0">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {stopNum}
                              </div>
                              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[12px]" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <Link href={`/scheduling/${appt.id}`} className="block hover:underline">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm text-foreground truncate">
                                    {appt.property.name}
                                  </span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"}`}>
                                    {appt.status.replace(/_/g, " ")}
                                  </span>
                                </div>
                              </Link>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {appt.property.addressLine1}, {appt.property.city}, {appt.property.state}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(appt.scheduledDate)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {appt.customer.firstName} {appt.customer.lastName}
                                </span>
                                <span className="text-xs font-medium text-foreground">
                                  {SERVICE_LABELS[appt.serviceType] ?? appt.serviceType.replace(/_/g, " ")}
                                </span>
                                {appt.k9Team && (
                                  <span className="text-xs text-muted-foreground">
                                    🐕 {appt.k9Team.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Maps button */}
                            <a
                              href={mapsUrl(appt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Open in Maps"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
