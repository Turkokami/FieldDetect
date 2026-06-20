import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function RoutesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 7);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      scheduledDate: { gte: today, lt: tomorrow },
      status: { notIn: ["CANCELLED", "NO_SHOW", "INSPECTION_COMPLETE"] },
    },
    include: {
      property: true,
      customer: true,
      technician: true,
    },
    orderBy: [{ scheduledDate: "asc" }],
  });

  const byTechnician = appointments.reduce<Record<string, typeof appointments>>((acc, appt) => {
    const key = appt.technician ? `${appt.technician.firstName} ${appt.technician.lastName}` : "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const statusColors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-green-100 text-green-700",
    EN_ROUTE: "bg-purple-100 text-purple-700",
    ARRIVED: "bg-indigo-100 text-indigo-700",
    INSPECTION_STARTED: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Route Planning</h1>
          <p className="text-sm text-muted-foreground mt-1">Next 7 days of appointments by technician</p>
        </div>
        <Link
          href="/scheduling/new"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + New Appointment
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📍</div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No upcoming appointments</h3>
          <p className="text-sm text-muted-foreground mb-4">Schedule appointments to see routes here.</p>
          <Link
            href="/scheduling/new"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Schedule an Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byTechnician).map(([techName, appts]) => (
            <div key={techName} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {techName === "Unassigned" ? "?" : techName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="font-semibold text-foreground text-sm">{techName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{appts.length} stops</span>
              </div>

              <div className="divide-y divide-border/50">
                {appts.map((appt, idx) => (
                  <Link
                    key={appt.id}
                    href={`/scheduling/${appt.id}`}
                    className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col items-center pt-0.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                      {idx < appts.length - 1 && (
                        <div className="w-px h-6 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">
                          {appt.property.name}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {appt.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {appt.property.addressLine1}, {appt.property.city}, {appt.property.state}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(appt.scheduledDate)} · {appt.customer.firstName} {appt.customer.lastName}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">→</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
