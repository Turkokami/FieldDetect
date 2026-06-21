import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, Plus, ArrowUpRight } from "lucide-react";

export const metadata = { title: "Invoices" };

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "info"> = {
  DRAFT: "secondary",
  SENT: "info",
  VIEWED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
  REFUNDED: "secondary",
};

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

      {/* Invoice list */}
      <div className="space-y-2">
        {invoices.map((inv) => (
          <Link key={inv.id} href={`/invoices/${inv.id}`}>
            <Card className="hover:shadow-sm transition-shadow cursor-pointer hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-50 shrink-0 mt-0.5">
                    <Receipt className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Name + badge */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-900 truncate">
                        {inv.customer.companyName ??
                          `${inv.customer.firstName} ${inv.customer.lastName}`}
                      </p>
                      <Badge variant={STATUS_VARIANTS[inv.status] ?? "secondary"} className="shrink-0">
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                    </div>
                    {/* Invoice meta */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 mb-2">
                      <span className="font-mono">{inv.invoiceNumber}</span>
                      {inv.inspection && (
                        <span>· {inv.inspection.inspectionNumber}</span>
                      )}
                      <span>· {formatDate(inv.createdAt)}</span>
                    </div>
                    {/* Amount row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</span>
                        {inv.balanceDue > 0 && inv.balanceDue !== inv.totalAmount && (
                          <span className="text-xs text-amber-600 ml-2">
                            {formatCurrency(inv.balanceDue)} due
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.dueDate && inv.status !== "PAID" && (
                          <p className="text-xs text-slate-400">
                            Due {formatDate(inv.dueDate)}
                          </p>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-16">
          <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No invoices found</p>
          <Button asChild className="mt-4">
            <Link href="/invoices/new">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
