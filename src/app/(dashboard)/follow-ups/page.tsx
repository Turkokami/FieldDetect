import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Follow-Ups" };

const RESULT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INCONCLUSIVE:       { label: "Inconclusive",     color: "#92400e", bg: "#fef9c3" },
  FOLLOW_UP_REQUIRED: { label: "Follow-Up Needed", color: "#c2410c", bg: "#ffedd5" },
  POSITIVE_K9_ALERT:  { label: "K9 Alert",         color: "#b91c1c", bg: "#fee2e2" },
  VISUAL_CONFIRMATION:{ label: "Visual Confirm.",   color: "#991b1b", bg: "#fecaca" },
};

export default async function FollowUpsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const [pendingInspections, pendingUnits, upcomingFollowUps] = await Promise.all([
    // Inspections where followUpRequired is true and no second inspection scheduled yet
    prisma.inspection.findMany({
      where: {
        organizationId: user.organizationId,
        followUpRequired: true,
      },
      include: {
        property: {
          include: { customer: { select: { firstName: true, lastName: true, companyName: true, phone: true, email: true } } },
        },
        technician: { select: { firstName: true, lastName: true } },
        appointment: { select: { id: true, status: true } },
        inspectionUnits: {
          where: {
            detectionResult: {
              in: ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION", "INCONCLUSIVE", "FOLLOW_UP_REQUIRED"],
            },
          },
          select: { unitNumber: true, detectionResult: true, alertLocation: true, followUpDate: true, photos: { select: { id: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
    }),

    // All units with follow-up dates set
    prisma.inspectionUnit.findMany({
      where: {
        inspection: { organizationId: user.organizationId },
        followUpRequired: true,
        followUpDate: { gte: new Date() },
      },
      include: {
        inspection: {
          include: {
            property: { select: { name: true, city: true, state: true } },
            appointment: { select: { id: true } },
          },
        },
      },
      orderBy: { followUpDate: "asc" },
      take: 20,
    }),

    // Appointments scheduled as follow-ups in next 30 days
    prisma.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        scheduledDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        description: { contains: "follow" },
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true } },
      },
      take: 10,
    }),
  ]);

  const overduePendingInspections = pendingInspections.filter(
    (i) => i.followUpDate && new Date(i.followUpDate) < new Date()
  );
  const upcomingPendingInspections = pendingInspections.filter(
    (i) => !i.followUpDate || new Date(i.followUpDate) >= new Date()
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Follow-Up Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingInspections.length} inspection{pendingInspections.length !== 1 ? "s" : ""} requiring follow-up
          </p>
        </div>
        <Link
          href="/scheduling/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#0ABAB5" }}
        >
          + Schedule Follow-Up
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-red-600">{overduePendingInspections.length}</div>
          <div className="text-xs font-semibold text-red-500 mt-1">Overdue</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-amber-600">{upcomingPendingInspections.length}</div>
          <div className="text-xs font-semibold text-amber-600 mt-1">Pending</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{pendingUnits.length}</div>
          <div className="text-xs font-semibold text-blue-600 mt-1">Units w/ Follow-Up Date</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-black text-green-600">{upcomingFollowUps.length}</div>
          <div className="text-xs font-semibold text-green-600 mt-1">Scheduled (30d)</div>
        </div>
      </div>

      {/* Overdue */}
      {overduePendingInspections.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Overdue Follow-Ups
          </h2>
          <div className="space-y-3">
            {overduePendingInspections.map((insp) => (
              <FollowUpCard key={insp.id} insp={insp} overdue />
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {upcomingPendingInspections.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-3">
            Pending Follow-Ups
          </h2>
          <div className="space-y-3">
            {upcomingPendingInspections.map((insp) => (
              <FollowUpCard key={insp.id} insp={insp} overdue={false} />
            ))}
          </div>
        </div>
      )}

      {/* Units with scheduled dates */}
      {pendingUnits.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">
            Unit Follow-Up Schedule
          </h2>
          <div className="space-y-2">
            {pendingUnits.map((u) => {
              const daysAway = Math.ceil(
                (new Date(u.followUpDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={u.id}
                  href={`/inspections/${u.inspectionId}`}
                  className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3 hover:border-[#0ABAB5]/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-foreground text-sm">{u.unitNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        daysAway <= 3 ? "bg-red-100 text-red-700" :
                        daysAway <= 7 ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {daysAway}d
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.inspection.property.name} · {u.inspection.property.city}, {u.inspection.property.state}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-foreground">{formatDate(u.followUpDate!)}</div>
                    <div className="text-xs text-muted-foreground">Follow-up date</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {pendingInspections.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1">No inspections currently require follow-up.</p>
        </div>
      )}
    </div>
  );
}

type InspectionWithRelations = Awaited<ReturnType<typeof prisma.inspection.findMany>>[0] & {
  property: { name: string; addressLine1: string; city: string; state: string; customer: { firstName: string; lastName: string; companyName: string | null; phone: string | null; email: string | null } };
  technician: { firstName: string; lastName: string };
  appointment: { id: string; status: string };
  inspectionUnits: { unitNumber: string; detectionResult: string; alertLocation: string | null; followUpDate: Date | null; photos: { id: string }[] }[];
};

function FollowUpCard({ insp, overdue }: { insp: InspectionWithRelations; overdue: boolean }) {
  const RESULT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    INCONCLUSIVE:       { label: "Inconclusive",     color: "#92400e", bg: "#fef9c3" },
    FOLLOW_UP_REQUIRED: { label: "Follow-Up Needed", color: "#c2410c", bg: "#ffedd5" },
    POSITIVE_K9_ALERT:  { label: "K9 Alert",         color: "#b91c1c", bg: "#fee2e2" },
    VISUAL_CONFIRMATION:{ label: "Visual Confirm.",   color: "#991b1b", bg: "#fecaca" },
  };

  return (
    <div className={`bg-card border rounded-xl p-5 ${overdue ? "border-red-200" : "border-amber-200"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {overdue ? "⚠️ OVERDUE" : "📋 PENDING"}
            </span>
            {insp.followUpDate && (
              <span className="text-xs text-muted-foreground">
                Due: {formatDate(insp.followUpDate)}
              </span>
            )}
          </div>
          <div className="font-bold text-foreground">{insp.property.name}</div>
          <div className="text-sm text-muted-foreground">
            {insp.property.city}, {insp.property.state} · {insp.property.customer.companyName ?? `${insp.property.customer.firstName} ${insp.property.customer.lastName}`}
          </div>
          {insp.property.customer.phone && (
            <a href={`tel:${insp.property.customer.phone}`} className="text-sm font-medium mt-1 block" style={{ color: "#0ABAB5" }}>
              {insp.property.customer.phone}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/inspections/${insp.id}`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors"
          >
            View Report
          </Link>
          <Link
            href={`/scheduling/new?customerId=${insp.property.customer.companyName}&propertyId=${insp.propertyId}`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
            style={{ background: "#0ABAB5" }}
          >
            Schedule Follow-Up
          </Link>
        </div>
      </div>

      {insp.inspectionUnits.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Affected Units ({insp.inspectionUnits.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {insp.inspectionUnits.slice(0, 12).map((u) => {
              const cfg = RESULT_CONFIG[u.detectionResult];
              return (
                <span
                  key={u.unitNumber}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                  style={cfg ? { background: cfg.bg, color: cfg.color } : { background: "#f1f5f9", color: "#475569" }}
                >
                  {u.unitNumber}
                  {u.photos.length > 0 && <span className="text-[10px] opacity-70">📷{u.photos.length}</span>}
                </span>
              );
            })}
            {insp.inspectionUnits.length > 12 && (
              <span className="text-xs text-muted-foreground py-1">+{insp.inspectionUnits.length - 12} more</span>
            )}
          </div>
        </div>
      )}

      {insp.treatmentReferral && (
        <div className="mt-3 text-xs font-semibold text-red-600 flex items-center gap-1.5">
          🔴 Treatment referral recommended
        </div>
      )}
    </div>
  );
}
