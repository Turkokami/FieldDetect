import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AlertTriangle, Clock, CheckCircle2, Phone, CalendarPlus, FileText } from "lucide-react";

export const metadata = { title: "Follow-Ups" };

const RESULT_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  INCONCLUSIVE:        { label: "Inconclusive",     color: "#eab308", bg: "rgba(234,179,8,0.12)",   emoji: "❓" },
  FOLLOW_UP_REQUIRED:  { label: "Follow-Up Needed", color: "#f97316", bg: "rgba(249,115,22,0.12)",  emoji: "📋" },
  POSITIVE_K9_ALERT:   { label: "K9 Alert",         color: "#ef4444", bg: "rgba(239,68,68,0.12)",   emoji: "🚨" },
  VISUAL_CONFIRMATION: { label: "Visual Confirm.",   color: "#dc2626", bg: "rgba(220,38,38,0.12)",   emoji: "👁️" },
};

function daysOverdue(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function FollowUpsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const inspections = await prisma.inspection.findMany({
    where: {
      organizationId: user.organizationId,
      followUpRequired: true,
    },
    include: {
      property: {
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      technician: { select: { firstName: true, lastName: true } },
      appointment: { select: { id: true, status: true, scheduledDate: true } },
      inspectionUnits: {
        where: {
          detectionResult: {
            in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION", "INCONCLUSIVE", "FOLLOW_UP_REQUIRED"],
          },
        },
        select: {
          unitNumber: true,
          detectionResult: true,
          alertLocation: true,
          followUpDate: true,
          photos: { select: { id: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const oneWeekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdue = inspections.filter((i) => i.followUpDate && new Date(i.followUpDate) < now);
  const dueThisWeek = inspections.filter(
    (i) => i.followUpDate && new Date(i.followUpDate) >= now && new Date(i.followUpDate) <= oneWeekOut
  );
  const pending = inspections.filter(
    (i) => !i.followUpDate || new Date(i.followUpDate) > oneWeekOut
  );

  const totalAlerts = inspections.filter(
    (i) => i.overallResult === "POSITIVE_K9_ALERT" || i.overallResult === "VISUAL_CONFIRMATION"
  ).length;
  const treatmentReferrals = inspections.filter((i) => i.treatmentReferral).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-Up Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspections requiring follow-up action
          </p>
        </div>
        <Link
          href="/scheduling/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
        >
          <CalendarPlus className="h-4 w-4" />
          Schedule Follow-Up
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="rounded-xl px-4 py-4 text-center"
          style={
            overdue.length > 0
              ? { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
          }
        >
          <div className="text-3xl font-black" style={{ color: overdue.length > 0 ? "#ef4444" : "var(--color-foreground)" }}>
            {overdue.length}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: overdue.length > 0 ? "#ef4444" : "var(--color-muted-foreground)" }}>
            Overdue
          </div>
        </div>
        <div
          className="rounded-xl px-4 py-4 text-center"
          style={
            dueThisWeek.length > 0
              ? { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
          }
        >
          <div className="text-3xl font-black" style={{ color: dueThisWeek.length > 0 ? "#f59e0b" : "var(--color-foreground)" }}>
            {dueThisWeek.length}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: dueThisWeek.length > 0 ? "#f59e0b" : "var(--color-muted-foreground)" }}>
            Due This Week
          </div>
        </div>
        <div
          className="rounded-xl px-4 py-4 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="text-3xl font-black text-foreground">{totalAlerts}</div>
          <div className="text-xs font-semibold mt-1 text-muted-foreground">K9 Alerts</div>
        </div>
        <div
          className="rounded-xl px-4 py-4 text-center"
          style={
            treatmentReferrals > 0
              ? { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
          }
        >
          <div className="text-3xl font-black" style={{ color: treatmentReferrals > 0 ? "#ef4444" : "var(--color-foreground)" }}>
            {treatmentReferrals}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: treatmentReferrals > 0 ? "#ef4444" : "var(--color-muted-foreground)" }}>
            Treatment Refs
          </div>
        </div>
      </div>

      {/* Empty state */}
      {inspections.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: "#22c55e" }} />
          <h3 className="text-lg font-semibold text-foreground">All caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No inspections currently require follow-up action.
          </p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#ef4444" }}>
              Overdue · {overdue.length}
            </h2>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="space-y-3">
            {overdue.map((insp) => (
              <FollowUpCard
                key={insp.id}
                insp={insp}
                urgency="overdue"
              />
            ))}
          </div>
        </section>
      )}

      {/* Due this week */}
      {dueThisWeek.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#f59e0b" }}>
              Due This Week · {dueThisWeek.length}
            </h2>
          </div>
          <div className="space-y-3">
            {dueThisWeek.map((insp) => (
              <FollowUpCard
                key={insp.id}
                insp={insp}
                urgency="soon"
              />
            ))}
          </div>
        </section>
      )}

      {/* Rest — pending */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Pending · {pending.length}
            </h2>
          </div>
          <div className="space-y-3">
            {pending.map((insp) => (
              <FollowUpCard
                key={insp.id}
                insp={insp}
                urgency="pending"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type InspectionRow = Awaited<ReturnType<typeof prisma.inspection.findMany<{
  include: {
    property: { include: { customer: { select: { id: true; firstName: true; lastName: true; companyName: true; phone: true; email: true } } } };
    technician: { select: { firstName: true; lastName: true } };
    appointment: { select: { id: true; status: true; scheduledDate: true } };
    inspectionUnits: {
      where: { detectionResult: { in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION", "INCONCLUSIVE", "FOLLOW_UP_REQUIRED"] } };
      select: { unitNumber: true; detectionResult: true; alertLocation: true; followUpDate: true; photos: { select: { id: true } } };
    };
  };
}>>>[0];

// ─── Card component ───────────────────────────────────────────────────────────

function FollowUpCard({
  insp,
  urgency,
}: {
  insp: InspectionRow;
  urgency: "overdue" | "soon" | "pending";
}) {
  const customer = insp.property.customer;
  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`;
  const overallCfg = insp.overallResult ? RESULT_CFG[insp.overallResult] : null;

  const accentColor =
    urgency === "overdue" ? "#ef4444" :
    urgency === "soon" ? "#f59e0b" :
    "#0ABAB5";

  const bgStyle =
    urgency === "overdue"
      ? { background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }
      : urgency === "soon"
      ? { background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.2)" }
      : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

  const scheduledDate = insp.appointment?.scheduledDate
    ? new Date(insp.appointment.scheduledDate).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div className="rounded-xl overflow-hidden" style={bgStyle}>
      {/* Left accent + header */}
      <div className="flex">
        <div className="w-0.5 shrink-0" style={{ background: accentColor }} />
        <div className="flex-1 p-4">
          {/* Top row: meta */}
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {/* Urgency badge */}
                {urgency === "overdue" && insp.followUpDate && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                  >
                    ⚠️ {daysOverdue(new Date(insp.followUpDate))}d overdue
                  </span>
                )}
                {urgency === "soon" && insp.followUpDate && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                  >
                    🕐 Due in {daysUntil(new Date(insp.followUpDate))}d
                  </span>
                )}
                {urgency === "pending" && !insp.followUpDate && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}
                  >
                    No date set
                  </span>
                )}
                {urgency === "pending" && insp.followUpDate && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5" }}
                  >
                    Due {new Date(insp.followUpDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {/* K9 result */}
                {overallCfg && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: overallCfg.bg, color: overallCfg.color }}
                  >
                    {overallCfg.emoji} {overallCfg.label}
                  </span>
                )}
                {insp.treatmentReferral && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                  >
                    🔴 Treatment Referral
                  </span>
                )}
              </div>

              <div className="font-bold text-foreground text-base leading-snug">{insp.property.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {customerName}
                {scheduledDate && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · Inspected {scheduledDate}
                  </span>
                )}
              </div>

              {/* Contact */}
              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium mt-1.5"
                  style={{ color: "#0ABAB5" }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {insp.appointment?.id && (
                <Link
                  href={`/inspections/${insp.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Report
                </Link>
              )}
              <Link
                href={`/scheduling/new?customerId=${customer.id}&propertyId=${insp.propertyId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ background: accentColor }}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Schedule Follow-Up
              </Link>
            </div>
          </div>

          {/* Affected units */}
          {insp.inspectionUnits.length > 0 && (
            <div
              className="rounded-lg p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {insp.inspectionUnits.length} Affected Unit{insp.inspectionUnits.length !== 1 ? "s" : ""}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insp.inspectionUnits.slice(0, 16).map((u) => {
                  const cfg = RESULT_CFG[u.detectionResult ?? ""];
                  return (
                    <span
                      key={u.unitNumber}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={
                        cfg
                          ? { background: cfg.bg, color: cfg.color }
                          : { background: "rgba(255,255,255,0.06)", color: "#94a3b8" }
                      }
                    >
                      {u.unitNumber}
                      {cfg && <span>{cfg.emoji}</span>}
                      {u.photos.length > 0 && (
                        <span className="opacity-60 text-[10px]">📷{u.photos.length}</span>
                      )}
                    </span>
                  );
                })}
                {insp.inspectionUnits.length > 16 && (
                  <span className="text-xs text-muted-foreground py-0.5">
                    +{insp.inspectionUnits.length - 16} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
