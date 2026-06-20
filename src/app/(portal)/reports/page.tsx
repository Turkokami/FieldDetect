import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, CheckCircle2, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Inspection Reports" };

const RESULT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NEGATIVE:            { label: "Negative",          color: "#16a34a", icon: CheckCircle2 },
  POSITIVE_K9_ALERT:   { label: "K9 Alert",          color: "#dc2626", icon: AlertTriangle },
  VISUAL_CONFIRMATION: { label: "Visual Confirm",    color: "#dc2626", icon: AlertTriangle },
  INCONCLUSIVE:        { label: "Inconclusive",      color: "#ca8a04", icon: Clock },
  FOLLOW_UP_REQUIRED:  { label: "Follow-Up Needed",  color: "#ea580c", icon: AlertTriangle },
};

export default async function PortalReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const customer = await prisma.customer.findUnique({ where: { clerkUserId: userId } });
  if (!customer) redirect("/sign-in");

  const inspections = await prisma.inspection.findMany({
    where: { property: { customerId: customer.id } },
    orderBy: { startTime: "desc" },
    include: {
      property: true,
      technician: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inspection Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">{inspections.length} total reports</p>
      </div>

      {inspections.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No inspection reports yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {inspections.map((ins) => {
              const cfg = ins.overallResult ? (RESULT_CONFIG[ins.overallResult] ?? null) : null;
              const Icon = cfg?.icon ?? FileText;
              return (
                <Link
                  key={ins.id}
                  href={`/portal/reports/${ins.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: cfg ? `${cfg.color}1a` : "rgba(10,186,181,0.1)" }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: cfg?.color ?? "#0ABAB5" }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{ins.property.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{ins.inspectionNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(ins.startTime)}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {ins.technician.firstName} {ins.technician.lastName}
                      </span>
                      {(ins.totalPositive ?? 0) > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-medium text-red-500">{ins.totalPositive} positive</span>
                        </>
                      )}
                    </div>
                  </div>

                  {cfg && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: `${cfg.color}1a`, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  )}

                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
