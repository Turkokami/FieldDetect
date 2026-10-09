import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SOURCE_LABELS, sourceLabel } from "@/lib/estimate-sources";
import { NOT_HOT_STATUSES, hotSince as hotWindowStart } from "@/lib/estimate-activity";

export const metadata = { title: "Estimates" };

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: "Draft",     bg: "#f1f5f9", color: "#64748b" },
  SENT:      { label: "Sent",      bg: "#dbeafe", color: "#1d4ed8" },
  VIEWED:    { label: "Viewed",    bg: "#e0e7ff", color: "#4338ca" },
  ACCEPTED:  { label: "Accepted",  bg: "#dcfce7", color: "#15803d" },
  DECLINED:  { label: "Declined",  bg: "#fee2e2", color: "#b91c1c" },
  EXPIRED:   { label: "Expired",   bg: "#f1f5f9", color: "#94a3b8" },
  CONVERTED: { label: "Converted", bg: "#d1fae5", color: "#065f46" },
};

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; hot?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { status, source, hot } = await searchParams;
  const hotSince = hotWindowStart();
  const hotWhere = {
    status: { notIn: [...NOT_HOT_STATUSES] },
    events: { some: { type: "OPENED" as const, createdAt: { gte: hotSince } } },
  };

  const [estimates, summaries, sources, hotCount] = await Promise.all([
    prisma.estimate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as never } : {}),
        ...(source ? (source === "manual" ? { OR: [{ source: "manual" }, { source: null }] } : { source }) : {}),
        ...(hot === "1" ? hotWhere : {}),
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true } },
        lineItems: { select: { id: true } },
        _count: { select: { events: { where: { type: "OPENED", createdAt: { gte: hotSince } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.estimate.groupBy({
      by: ["status"],
      where: { organizationId: user.organizationId },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.estimate.groupBy({
      by: ["source"],
      where: { organizationId: user.organizationId },
      _count: { id: true },
    }),
    prisma.estimate.count({ where: { organizationId: user.organizationId, ...hotWhere } }),
  ]);

  // Filter links keep the other active filters.
  const href = (next: { status?: string | null; source?: string | null; hot?: string | null }) => {
    const q = new URLSearchParams();
    const merged = { status, source, hot, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const qs = q.toString();
    return qs ? `/estimates?${qs}` : "/estimates";
  };
  const sourceCounts = sources.reduce((acc: Record<string, number>, s) => {
    const key = s.source ?? "manual";
    acc[key] = (acc[key] ?? 0) + s._count.id;
    return acc;
  }, {});
  const sourceKeys = [...new Set([...Object.keys(SOURCE_LABELS), ...Object.keys(sourceCounts)])].filter((k) => sourceCounts[k]);
  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`;

  const statusCounts = summaries.reduce((acc: Record<string, number>, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const totalPending = summaries
    .filter((s) => ["SENT", "VIEWED"].includes(s.status))
    .reduce((sum, s) => sum + (s._sum.totalAmount ?? 0), 0);

  const filterStatuses = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "CONVERTED"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalPending)} pending acceptance
          </p>
        </div>
        <Link
          href="/estimates/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#0ABAB5" }}
        >
          + New Estimate
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Link href={href({ status: null, hot: null })} className={pill(!status && hot !== "1")}>
          All
        </Link>
        <Link href={href({ hot: hot === "1" ? null : "1", status: null })} className={pill(hot === "1")}>
          🔥 Hot ({hotCount})
        </Link>
        {filterStatuses.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Link key={s} href={href({ status: s, hot: null })} className={pill(status === s)}>
              {cfg?.label ?? s} ({statusCounts[s] ?? 0})
            </Link>
          );
        })}
      </div>

      {/* Source filters */}
      {sourceKeys.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">Source</span>
          <Link href={href({ source: null })} className={pill(!source)}>Any</Link>
          {sourceKeys.map((k) => (
            <Link key={k} href={href({ source: k })} className={pill(source === k)}>
              {sourceLabel(k)} ({sourceCounts[k]})
            </Link>
          ))}
        </div>
      )}

      {/* Estimate list */}
      <div className="space-y-2">
        {estimates.map((est) => {
          const cfg = STATUS_CONFIG[est.status] ?? { label: est.status, bg: "#f1f5f9", color: "#64748b" };
          const customerName = est.customer.companyName ?? `${est.customer.firstName} ${est.customer.lastName}`;
          const isExpired = est.validUntil && new Date(est.validUntil) < new Date() && est.status !== "ACCEPTED" && est.status !== "CONVERTED";
          return (
            <Link key={est.id} href={`/estimates/${est.id}`} className="block">
              <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow hover:border-[#0ABAB5]/30">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{est.estimateNumber}</span>
                      {est._count.events > 0 && !(NOT_HOT_STATUSES as readonly string[]).includes(est.status) && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700" title="Opened in the last 24 hours">
                          🔥 Hot
                        </span>
                      )}
                      {est.source && est.source !== "manual" && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {sourceLabel(est.source)}
                        </span>
                      )}
                      {isExpired && est.status !== "EXPIRED" && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-foreground truncate">{customerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {est.title && <span>{est.title} · </span>}
                      {est.property?.name ?? "No property"} · {est.lineItems.length} item{est.lineItems.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg text-foreground">{formatCurrency(est.totalAmount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {est.validUntil ? `Valid until ${formatDate(est.validUntil)}` : `Created ${formatDate(est.createdAt)}`}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {estimates.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-foreground">No estimates yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first estimate to start winning jobs.</p>
          <Link
            href="/estimates/new"
            className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#0ABAB5" }}
          >
            + New Estimate
          </Link>
        </div>
      )}
    </div>
  );
}
