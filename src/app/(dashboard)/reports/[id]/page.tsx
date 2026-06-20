import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const inspection = await prisma.inspection.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      property: {
        include: { customer: true },
      },
      technician: true,
      k9Team: { include: { dogs: true } },
      appointment: true,
      inspectionUnits: {
        include: { photos: true },
        orderBy: { sortOrder: "asc" },
      },
      photos: true,
    },
  });

  if (!inspection) notFound();

  const RESULT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    NEGATIVE: { label: "Negative", color: "text-green-700", bg: "bg-green-50" },
    POSITIVE_K9_ALERT: { label: "K9 Alert", color: "text-red-700", bg: "bg-red-50" },
    VISUAL_CONFIRMATION: { label: "Visual Confirmed", color: "text-red-600", bg: "bg-red-50" },
    INCONCLUSIVE: { label: "Inconclusive", color: "text-yellow-700", bg: "bg-yellow-50" },
    UNABLE_TO_INSPECT: { label: "Unable to Inspect", color: "text-gray-600", bg: "bg-gray-50" },
    ACCESS_DENIED: { label: "Access Denied", color: "text-orange-600", bg: "bg-orange-50" },
    FOLLOW_UP_REQUIRED: { label: "Follow-Up Required", color: "text-blue-600", bg: "bg-blue-50" },
  };

  const positiveUnits = inspection.inspectionUnits.filter((u) =>
    ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(u.detectionResult ?? "")
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-muted-foreground hover:text-foreground text-sm">
            ← Reports
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">
            Inspection Report #{inspection.inspectionNumber}
          </h1>
        </div>
        <a
          href={`/api/reports/${id}/pdf`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Download PDF
        </a>
      </div>

      {/* Summary Card */}
      <div className={`rounded-xl p-6 border-2 ${
        inspection.overallResult === "NEGATIVE"
          ? "bg-green-50 border-green-200"
          : ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(inspection.overallResult ?? "")
          ? "bg-red-50 border-red-200"
          : "bg-yellow-50 border-yellow-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Overall Result</div>
            <div className={`text-2xl font-bold mt-1 ${
              inspection.overallResult === "NEGATIVE" ? "text-green-700" :
              ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(inspection.overallResult ?? "") ? "text-red-700" :
              "text-yellow-700"
            }`}>
              {RESULT_CONFIG[inspection.overallResult ?? ""]?.label ?? inspection.overallResult?.replace(/_/g, " ") ?? "Pending"}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-700">{inspection.totalPositive}</div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{inspection.totalNegative}</div>
              <div className="text-xs text-muted-foreground">Negative</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-700">{inspection.totalInconclusive}</div>
              <div className="text-xs text-muted-foreground">Inconclusive</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{inspection.totalInaccessible}</div>
              <div className="text-xs text-muted-foreground">Inaccessible</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Inspection Info
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Date</dt>
                <dd className="text-sm text-foreground">{formatDate(inspection.startTime ?? inspection.createdAt)}</dd>
              </div>
              {inspection.startTime && (
                <div>
                  <dt className="text-xs text-muted-foreground">Start Time</dt>
                  <dd className="text-sm text-foreground">{formatDateTime(inspection.startTime)}</dd>
                </div>
              )}
              {inspection.endTime && (
                <div>
                  <dt className="text-xs text-muted-foreground">End Time</dt>
                  <dd className="text-sm text-foreground">{formatDateTime(inspection.endTime)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Service</dt>
                <dd className="text-sm text-foreground">
                  {inspection.serviceType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </dd>
              </div>
              {inspection.technician && (
                <div>
                  <dt className="text-xs text-muted-foreground">Inspector</dt>
                  <dd className="text-sm text-foreground">
                    {inspection.technician.firstName} {inspection.technician.lastName}
                  </dd>
                </div>
              )}
              {inspection.k9Team && (
                <div>
                  <dt className="text-xs text-muted-foreground">K9 Team</dt>
                  <dd className="text-sm text-foreground">
                    {inspection.k9Team.name}
                    {inspection.k9Team.dogs.length > 0 && (
                      <span className="text-muted-foreground"> — {inspection.k9Team.dogs.map((d) => d.name).join(", ")}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Customer &amp; Property
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd>
                  <Link href={`/customers/${inspection.property.customer.id}`} className="text-sm text-primary hover:underline">
                    {inspection.property.customer.firstName} {inspection.property.customer.lastName}
                    {inspection.property.customer.companyName && (
                      <span className="text-muted-foreground"> — {inspection.property.customer.companyName}</span>
                    )}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Property</dt>
                <dd>
                  <Link href={`/properties/${inspection.property.id}`} className="text-sm text-primary hover:underline">
                    {inspection.property.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {inspection.property.addressLine1}<br />
                    {inspection.property.city}, {inspection.property.state} {inspection.property.zip}
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          {inspection.followUpRequired && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-blue-800 mb-1">Follow-Up Required</div>
              {inspection.followUpDate && (
                <div className="text-sm text-blue-700">By {formatDate(inspection.followUpDate)}</div>
              )}
              {inspection.treatmentReferral && (
                <div className="text-sm text-blue-700 mt-1">Treatment referral recommended</div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Positive Units */}
          {positiveUnits.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-red-800 mb-3">
                Positive Units ({positiveUnits.length})
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {positiveUnits.map((u) => (
                  <div key={u.id} className="bg-red-100 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-red-800">{u.unitNumber}</div>
                    <div className="text-xs text-red-600">
                      {RESULT_CONFIG[u.detectionResult ?? ""]?.label ?? u.detectionResult?.replace(/_/g, " ") ?? ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Units */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Unit Results ({inspection.inspectionUnits.length} units)
            </h2>
            <div className="space-y-1">
              {inspection.inspectionUnits.map((unit) => {
                const config = RESULT_CONFIG[unit.detectionResult ?? ""];
                return (
                  <div
                    key={unit.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${config?.bg ?? "bg-muted/30"}`}
                  >
                    <span className="text-sm font-medium text-foreground">{unit.unitNumber}</span>
                    <span className={`text-xs font-medium ${config?.color ?? "text-muted-foreground"}`}>
                      {config?.label ?? unit.detectionResult?.replace(/_/g, " ") ?? "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          {(inspection.summaryNotes || inspection.recommendations) && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              {inspection.summaryNotes && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-2">Summary Notes</h2>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{inspection.summaryNotes}</p>
                </div>
              )}
              {inspection.recommendations && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-2">Recommendations</h2>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{inspection.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
