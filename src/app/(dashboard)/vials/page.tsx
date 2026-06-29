import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Plus, FlaskConical } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export const metadata = { title: "Vial Tracker" };

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:   { bg: "bg-green-100",  text: "text-green-700",  label: "Active" },
  RETIRED:  { bg: "bg-slate-100",  text: "text-slate-500",  label: "Retired" },
  DEAD:     { bg: "bg-red-100",    text: "text-red-600",    label: "Dead" },
};

const HOST_LABELS: Record<string, string> = {
  HUMAN: "Human",
  PET:   "Pet",
  OTHER: "Other",
};

export default async function VialsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const vials = await prisma.bedBugVial.findMany({
    where: { organizationId: user.organizationId },
    include: {
      feedingLogs: {
        orderBy: { fedAt: "desc" },
        take: 1,
      },
      _count: { select: { feedingLogs: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);
  const active = vials.filter((v) => v.status === "ACTIVE");
  const inactive = vials.filter((v) => v.status !== "ACTIVE");

  function FeedingBadge({ vial }: { vial: typeof vials[0] }) {
    const last = vial.feedingLogs[0];
    if (!last) return <span className="text-xs text-muted-foreground italic">Never fed</span>;
    const days = differenceInDays(new Date(), new Date(last.fedAt));
    const urgent = days >= 7;
    return (
      <span className={`text-xs font-medium ${urgent ? "text-amber-600" : "text-muted-foreground"}`}>
        {days === 0 ? "Fed today" : days === 1 ? "Fed yesterday" : `Fed ${days}d ago`}
        {" · "}{HOST_LABELS[last.fedOn] ?? last.fedOn}
      </span>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vial Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.length} active vial{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <Link
            href="/vials/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vial
          </Link>
        )}
      </div>

      {vials.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No vials tracked yet</p>
          <p className="text-sm mt-1">Add bed bug vials to track feeding schedules for K9 training.</p>
          {canEdit && (
            <Link
              href="/vials/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Vial
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Vials</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((v) => {
                  const status = STATUS_STYLES[v.status];
                  const last = v.feedingLogs[0];
                  const overdue = last ? differenceInDays(new Date(), new Date(last.fedAt)) >= 7 : true;
                  return (
                    <Link
                      key={v.id}
                      href={`/vials/${v.id}`}
                      className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overdue ? "bg-amber-100" : "bg-primary/10"}`}>
                            <FlaskConical className={`h-5 w-5 ${overdue ? "text-amber-600" : "text-primary"}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{v.name}</h3>
                            {v.colony && <p className="text-xs text-muted-foreground">{v.colony}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-border space-y-1">
                        <FeedingBadge vial={v} />
                        <div className="text-xs text-muted-foreground">
                          {v._count.feedingLogs} feeding{v._count.feedingLogs !== 1 ? "s" : ""} logged
                          {" · "}Since {format(new Date(v.acquisitionDate), "MMM d, yyyy")}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Retired / Dead</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map((v) => {
                  const status = STATUS_STYLES[v.status] ?? STATUS_STYLES.RETIRED;
                  return (
                    <Link
                      key={v.id}
                      href={`/vials/${v.id}`}
                      className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group opacity-60"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-foreground truncate">{v.name}</h3>
                            {v.colony && <p className="text-xs text-muted-foreground">{v.colony}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{v._count.feedingLogs} feedings total</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
