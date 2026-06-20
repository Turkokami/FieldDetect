import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, Download, CheckCircle2, AlertTriangle, Minus } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Inspection Report" };

const DETECTION_LABEL: Record<string, string> = {
  NEGATIVE:            "Negative — No Detection",
  POSITIVE_K9_ALERT:   "Positive K9 Alert",
  VISUAL_CONFIRMATION: "Visual Confirmation",
  INCONCLUSIVE:        "Inconclusive",
  UNABLE_TO_INSPECT:   "Unable to Inspect",
  ACCESS_DENIED:       "Access Denied",
  FOLLOW_UP_REQUIRED:  "Follow-Up Required",
};

const RESULT_COLOR: Record<string, string> = {
  NEGATIVE:            "#16a34a",
  POSITIVE_K9_ALERT:   "#dc2626",
  VISUAL_CONFIRMATION: "#dc2626",
  INCONCLUSIVE:        "#ca8a04",
  UNABLE_TO_INSPECT:   "#64748b",
  ACCESS_DENIED:       "#64748b",
  FOLLOW_UP_REQUIRED:  "#ea580c",
};

export default async function PortalReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const { id } = await params;
  const inspection = await prisma.inspection.findFirst({
    where: {
      id,
      property: { customerId: customer.id },
    },
    include: {
      property: true,
      technician: true,
      k9Dog: true,
      inspectionUnits: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!inspection) notFound();

  const negCount = inspection.totalNegative ?? 0;
  const posCount = inspection.totalPositive ?? 0;
  const incCount = inspection.totalInconclusive ?? 0;
  const naCount  = inspection.totalInaccessible ?? 0;

  return (
    <div className="space-y-6">
      {/* Back + Download */}
      <div className="flex items-center justify-between">
        <Link href="/portal/reports" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          All Reports
        </Link>
        <a
          href={`/api/reports/${inspection.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
        >
          <Download className="h-4 w-4" />
          Download Report
        </a>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">{inspection.property.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{inspection.inspectionNumber}</p>
            </div>
            {inspection.overallResult && (
              <span
                className="text-sm font-semibold px-3 py-1.5 rounded-full shrink-0"
                style={{
                  background: `${RESULT_COLOR[inspection.overallResult] ?? "#64748b"}1a`,
                  color: RESULT_COLOR[inspection.overallResult] ?? "#64748b",
                }}
              >
                {DETECTION_LABEL[inspection.overallResult] ?? inspection.overallResult}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Date</div>
            <div className="text-sm font-semibold text-foreground">{formatDate(inspection.startTime)}</div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Technician</div>
            <div className="text-sm font-semibold text-foreground">
              {inspection.technician.firstName} {inspection.technician.lastName}
            </div>
          </div>
          {inspection.k9Dog && (
            <div className="px-5 py-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">K9 Dog</div>
              <div className="text-sm font-semibold text-foreground">{inspection.k9Dog.name}</div>
            </div>
          )}
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Service</div>
            <div className="text-sm font-semibold text-foreground">{inspection.serviceType.replace(/_/g, " ")}</div>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Negative", count: negCount, color: "#16a34a", icon: CheckCircle2 },
          { label: "Positive", count: posCount, color: "#dc2626", icon: AlertTriangle },
          { label: "Inconclusive", count: incCount, color: "#ca8a04", icon: Minus },
          { label: "Inaccessible", count: naCount, color: "#64748b", icon: Minus },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-3xl font-bold" style={{ color }}>{count}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Icon className="h-3 w-3" style={{ color }} />
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Unit-by-unit results */}
      {inspection.inspectionUnits.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm">
              Unit Results ({inspection.inspectionUnits.length} units)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Building</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspection.inspectionUnits.map((u) => {
                  const color = RESULT_COLOR[u.detectionResult] ?? "#64748b";
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{u.unitNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.buildingName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}1a`, color }}
                        >
                          {DETECTION_LABEL[u.detectionResult] ?? u.detectionResult}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {u.technicianNotes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes & Recommendations */}
      {(inspection.summaryNotes || inspection.recommendations) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inspection.summaryNotes && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Summary of Findings</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{inspection.summaryNotes}</p>
            </div>
          )}
          {inspection.recommendations && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Recommendations</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{inspection.recommendations}</p>
            </div>
          )}
        </div>
      )}

      {/* Follow-up flags */}
      {(inspection.followUpRequired || inspection.treatmentReferral) && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/40 p-4 space-y-1">
          {inspection.followUpRequired && (
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              ⚠ Follow-up inspection required{inspection.followUpDate ? ` · ${formatDate(inspection.followUpDate)}` : ""}
            </p>
          )}
          {inspection.treatmentReferral && (
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              ⚠ Treatment referral recommended — please contact us to schedule
            </p>
          )}
        </div>
      )}
    </div>
  );
}
