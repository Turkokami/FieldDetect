import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";
import { InvoiceListClient } from "@/components/invoices/invoice-list-client";

export const metadata = { title: "Invoices" };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { status, page = "1" } = await searchParams;
  const pageNum = parseInt(page);
  const pageSize = 20;

  type InvoiceStatusEnum = import("@prisma/client").InvoiceStatus;
  const orgFilter = { organizationId: user.organizationId };
  const statusFilter = status ? { status: status as InvoiceStatusEnum } : {};

  const [invoices, total, summaries] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...orgFilter, ...statusFilter },
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        inspection: {
          select: { inspectionNumber: true, startTime: true },
        },
        _count: { select: { payments: true } },
      },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where: { ...orgFilter, ...statusFilter } }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { organizationId: user.organizationId },
      _count: { id: true },
      _sum: { balanceDue: true, totalAmount: true },
    }),
  ]);

  const totalOutstanding = summaries
    .filter((s: { status: string }) => ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(s.status))
    .reduce((sum: number, s: { _sum: { balanceDue: number | null } }) => sum + (s._sum.balanceDue ?? 0), 0);

  const statusCounts = summaries.reduce((acc: Record<string, number>, s: { status: string; _count: { id: number } }) => {
    acc[s.status] = s._count.id;
    return acc;
  }, {} as Record<string, number>);

  const filterStatuses = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "DRAFT"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatCurrency(totalOutstanding)} outstanding
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/invoices"
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({total})
        </Link>
        {filterStatuses.map((s) => (
          <Link
            key={s}
            href={`/invoices?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
          </Link>
        ))}
      </div>

      <InvoiceListClient invoices={JSON.parse(JSON.stringify(invoices))} />
    </div>
  );
}
