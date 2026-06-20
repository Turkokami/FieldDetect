import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, ChevronRight } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "info" as "default",
  VIEWED: "info" as "default",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  balanceDue: number;
  createdAt: Date;
  customer: { firstName: string; lastName: string; companyName?: string | null };
}

export function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          Outstanding Invoices
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/invoices">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoices.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No outstanding invoices</p>
        )}
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {inv.customer.companyName ?? `${inv.customer.firstName} ${inv.customer.lastName}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {inv.invoiceNumber} · {formatDate(inv.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(inv.balanceDue)}
                </p>
                <p className="text-xs text-slate-400">due</p>
              </div>
              <Badge variant={statusVariant[inv.status] ?? "secondary"}>
                {inv.status.replace("_", " ")}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
