import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Job History" };

const RESULT_COLORS: Record<string, string> = {
  NEGATIVE:            "#22c55e",
  POSITIVE_K9_ALERT:   "#ef4444",
  VISUAL_CONFIRMATION: "#dc2626",
  INCONCLUSIVE:        "#eab308",
  UNABLE_TO_INSPECT:   "#64748b",
  ACCESS_DENIED:       "#f97316",
  FOLLOW_UP_REQUIRED:  "#3b82f6",
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
      property: { select: { name: true, city: true, state: true } },
      inspection: { select: { id: true, overallResult: true, totalPositive: true, totalNegative: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 60,
  });

  return (
    <div className="px-4 pt-14 pb-6" style={{ background: "#0A0F1A", minHeight: "100vh" }}>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#0ABAB5" }}>
          Field Tech
        </div>
        <h1 className="text-xl font-bold text-white">Job History</h1>
        <p className="text-sm text-slate-400 mt-0.5">{past.length} completed jobs</p>
      </div>

      <div className="space-y-3">
        {past.map((job) => {
          const customerName = job.customer.companyName ?? `${job.customer.firstName} ${job.customer.lastName}`;
          const result = job.inspection?.overallResult;
          const resultColor = result ? RESULT_COLORS[result] : "#64748b";
          const date = new Date(job.scheduledDate).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric"
          });

          return (
            <Link
              key={job.id}
              href={`/field/${job.id}`}
              className="block rounded-2xl p-4 transition-all active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 mb-0.5">{date}</div>
                  <div className="font-bold text-white truncate">{job.property.name}</div>
                  <div className="text-xs text-slate-400">{customerName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{job.property.city}, {job.property.state}</div>
                </div>
                {result && (
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold" style={{ color: resultColor }}>
                      {result.replace(/_/g, " ")}
                    </div>
                    {job.inspection?.totalPositive !== undefined && job.inspection.totalPositive > 0 && (
                      <div className="text-xs text-red-400 mt-0.5">{job.inspection.totalPositive} positive</div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {past.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🐾</div>
          <div className="text-sm text-slate-500">No completed jobs yet</div>
        </div>
      )}
    </div>
  );
}
