import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Appointments" };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED:           { label: "Scheduled",          color: "#0ABAB5", icon: <Clock className="h-4 w-4" /> },
  CONFIRMED:           { label: "Confirmed",           color: "#16a34a", icon: <CheckCircle2 className="h-4 w-4" /> },
  EN_ROUTE:            { label: "On the Way",          color: "#7c3aed", icon: <Clock className="h-4 w-4" /> },
  ON_SITE:             { label: "On Site",             color: "#7c3aed", icon: <Clock className="h-4 w-4" /> },
  INSPECTION_STARTED:  { label: "In Progress",        color: "#d97706", icon: <Clock className="h-4 w-4" /> },
  INSPECTION_COMPLETE: { label: "Complete",           color: "#16a34a", icon: <CheckCircle2 className="h-4 w-4" /> },
  CANCELLED:           { label: "Cancelled",          color: "#94a3b8", icon: <XCircle className="h-4 w-4" /> },
  NO_SHOW:             { label: "No Show",            color: "#dc2626", icon: <XCircle className="h-4 w-4" /> },
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "Bed Bug Inspection",
  GENERAL_PEST: "General Pest Inspection",
  RODENT: "Rodent Inspection",
  TERMITE: "Termite Inspection",
  FOLLOW_UP: "Follow-Up Inspection",
  OTHER: "Inspection",
};

export default async function PortalAppointmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        property: { customerId: customer.id },
        scheduledDate: { gte: now },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      include: {
        property: { select: { name: true, addressLine1: true, city: true } },
        technician: { select: { firstName: true, lastName: true } },
        k9Team: { select: { name: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: {
        property: { customerId: customer.id },
        OR: [
          { scheduledDate: { lt: now } },
          { status: { in: ["CANCELLED", "NO_SHOW", "INSPECTION_COMPLETE"] } },
        ],
      },
      include: {
        property: { select: { name: true, addressLine1: true, city: true } },
        technician: { select: { firstName: true, lastName: true } },
        inspection: { select: { id: true, inspectionNumber: true } },
      },
      orderBy: { scheduledDate: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {upcoming.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status] ?? { label: apt.status, color: "#0ABAB5", icon: <Clock className="h-4 w-4" /> };
              const serviceLabel = SERVICE_LABELS[apt.serviceType] ?? apt.serviceType;
              return (
                <div key={apt.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{apt.property.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {apt.property.addressLine1}, {apt.property.city}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs font-medium text-foreground">
                        {new Date(apt.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric",
                        })} at {new Date(apt.scheduledDate).toLocaleTimeString("en-US", {
                          hour: "numeric", minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">{serviceLabel}</span>
                    </div>
                    {apt.technician && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Technician: {apt.technician.firstName} {apt.technician.lastName}
                      </div>
                    )}
                    {apt.k9Team && (
                      <div className="text-xs text-muted-foreground">K9 Team: {apt.k9Team.name}</div>
                    )}
                    {apt.notes && (
                      <div className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {upcoming.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No upcoming appointments scheduled.</p>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {past.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status] ?? { label: apt.status, color: "#64748b", icon: <Clock className="h-4 w-4" /> };
              const serviceLabel = SERVICE_LABELS[apt.serviceType] ?? apt.serviceType;
              return (
                <div key={apt.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 opacity-60"
                    style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{apt.property.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(apt.scheduledDate)} · {serviceLabel}
                    </div>
                    {apt.inspection && (
                      <Link
                        href={`/portal/reports/${apt.inspection.id}`}
                        className="text-xs font-medium mt-1 block transition-colors"
                        style={{ color: "#0ABAB5" }}
                      >
                        View report {apt.inspection.inspectionNumber} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
