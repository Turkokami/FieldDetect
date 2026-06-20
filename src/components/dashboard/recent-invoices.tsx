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
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "rgba(10,186,181,0.12)" }}>
            <Receipt className="h-3.5 w-3.5" style={{ color: "#0ABAB5" }} />
          </span>
          Outstanding Invoices
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" asChild>
          <Link href="/invoices">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-2">
        {invoices.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No outstanding invoices</p>
        )}
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/40 transition-all duration-150"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {inv.customer.companyName ?? `${inv.customer.firstName} ${inv.customer.lastName}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {inv.invoiceNumber} · {formatDate(inv.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(inv.balanceDue)}
                </p>
                <p className="text-xs text-muted-foreground">due</p>
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
