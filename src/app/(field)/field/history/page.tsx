import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Job History" };

const RESULT_CFG: Record<string, { label: string; color: string; emoji: string }> = {
  NEGATIVE:            { label: "All Clear",    color: "#22c55e", emoji: "✅" },
  POSITIVE_K9_ALERT:   { label: "K9 Alert",    color: "#ef4444", emoji: "🚨" },
  VISUAL_CONFIRMATION: { label: "Visual +",    color: "#dc2626", emoji: "👁️" },
  INCONCLUSIVE:        { label: "Inconclusive", color: "#eab308", emoji: "❓" },
  UNABLE_TO_INSPECT:   { label: "No Access",   color: "#64748b", emoji: "🚫" },
  ACCESS_DENIED:       { label: "Denied",      color: "#f97316", emoji: "⛔" },
  FOLLOW_UP_REQUIRED:  { label: "Follow-Up",   color: "#3b82f6", emoji: "📋" },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  INSPECTION_COMPLETE: { label: "Complete",    color: "#22c55e" },
  REPORT_SENT:         { label: "Report Sent", color: "#0ABAB5" },
  INVOICED:            { label: "Invoiced",    color: "#0ea5e9" },
  PAID:                { label: "Paid",        color: "#10b981" },
  CANCELLED:           { label: "Cancelled",   color: "#64748b" },
  NO_SHOW:             { label: "No Show",     color: "#ef4444" },
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION:       "Bed Bug Inspection",
  BED_BUG_TREATMENT:        "Bed Bug Treatment",
  RODENT_INSPECTION:        "Rodent Inspection",
  GENERAL_PEST_INSPECTION:  "General Pest Inspection",
  FOLLOW_UP:                "Follow-Up Inspection",
  OTHER:                    "Service Call",
};

export default async function FieldHistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const past = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      technicianId: user.id,
      status: { in: ["INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID", "CANCELLED", "NO_SHOW"] },
    },
    include: {
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      property: { select: { name: true, addressLine1: true, city: true, state: true } },
      inspection: { select: { id: true, overallResult: true, totalPositive: true, totalNegative: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 60,
  });

  // Group by month
  const grouped: Record<string, typeof past> = {};
  for (const job of past) {
    const key = new Date(job.scheduledDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(job);
  }

  return (
    <div className="min-h-screen pb-6" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: "linear-gradient(180deg, #0D1A2A 0%, #0A0F1A 100%)" }}>
        <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "#0ABAB5" }}>
          FieldDetect
        </div>
        <h1 className="text-2xl font-black text-white">Job History</h1>
        <p className="text-sm text-slate-400 mt-0.5">{past.length} completed inspection{past.length !== 1 ? "s" : ""}</p>
      </div>

      {past.length === 0 ? (
        <div className="px-4">
          <div
            className="rounded-2xl px-6 py-12 flex flex-col items-center text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
              style={{ background: "rgba(10,186,181,0.1)", border: "1px solid rgba(10,186,181,0.2)" }}
            >
              🐾
            </div>
            <div className="font-semibold text-white mb-1">No history yet</div>
            <div className="text-sm text-slate-500">Completed jobs will appear here</div>
          </div>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {Object.entries(grouped).map(([month, jobs]) => (
            <div key={month}>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">{month}</div>
              <div className="space-y-2.5">
                {jobs.map((job) => {
                  const customerName = job.customer.companyName ?? `${job.customer.firstName} ${job.customer.lastName}`;
                  const result = job.inspection?.overallResult;
                  const resultCfg = result ? RESULT_CFG[result] : null;
                  const statusCfg = STATUS_CFG[job.status];
                  const hasAlert = result === "POSITIVE_K9_ALERT" || result === "VISUAL_CONFIRMATION";

                  const date = new Date(job.scheduledDate);
                  const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  const timeLabel = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

                  return (
                    <Link
                      key={job.id}
                      href={`/field/${job.id}`}
                      className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                      style={{
                        background: hasAlert ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${hasAlert ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {/* Result stripe */}
                      <div
                        className="h-1"
                        style={{ background: resultCfg?.color ?? statusCfg?.color ?? "#334155" }}
                      />
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Result bubble */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: resultCfg ? `${resultCfg.color}18` : "rgba(255,255,255,0.05)" }}
                          >
                            {resultCfg?.emoji ?? "📋"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">{job.property.name}</div>
                                <div className="text-xs text-slate-400 truncate">{customerName}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold" style={{ color: resultCfg?.color ?? statusCfg?.color ?? "#64748b" }}>
                                  {resultCfg?.label ?? "—"}
                                </div>
                                {statusCfg && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">{statusCfg.label}</div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[11px] text-slate-500">{dayLabel} · {timeLabel}</span>
                              <span className="text-[11px] text-slate-600">·</span>
                              <span className="text-[11px] text-slate-500">{SERVICE_LABELS[job.serviceType] ?? job.serviceType}</span>
                            </div>

                            {hasAlert && job.inspection && job.inspection.totalPositive > 0 && (
                              <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                                🚨 {job.inspection.totalPositive} positive unit{job.inspection.totalPositive > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
