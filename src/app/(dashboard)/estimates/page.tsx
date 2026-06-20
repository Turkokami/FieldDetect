import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { status } = await searchParams;

  const [estimates, summaries] = await Promise.all([
    prisma.estimate.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        property: { select: { name: true, city: true } },
        lineItems: { select: { id: true } },
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
  ]);

  const statusCounts = summaries.reduce((acc: Record<string, number>, s) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {});

  const totalPending = summaries
    .filter((s) => ["SENT", "VIEWED"].includes(s.status))
    .reduce((sum, s) => sum + (s._sum.totalAmount ?? 0), 0);

  const filterStatuses = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "CONVERTED"];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
        <Link
          href="/estimates"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !status ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({estimates.length})
        </Link>
        {filterStatuses.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Link
              key={s}
              href={`/estimates?status=${s}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cfg?.label ?? s} ({statusCounts[s] ?? 0})
            </Link>
          );
        })}
      </div>

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
                      {isExpired && (
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
