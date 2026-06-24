import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import InvoiceActions from "@/components/invoices/invoice-actions";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: true,
      inspection: {
        include: {
          appointment: {
            select: { id: true, serviceType: true },
          },
          property: { select: { id: true, name: true, addressLine1: true, city: true, state: true, zip: true } },
        },
      },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      organization: true,
    },
  });

  if (!invoice) notFound();

  const remaining = Number(invoice.balanceDue);

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    VIEWED: "bg-indigo-100 text-indigo-700",
    PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    REFUNDED: "bg-purple-100 text-purple-700",
  };

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: "Cash",
    CHECK: "Check",
    CREDIT_CARD: "Credit Card",
    DEBIT_CARD: "Debit Card",
    ACH: "ACH",
    STRIPE: "Card (Online)",
    SQUARE: "Square",
    OTHER: "Other",
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/invoices" className="text-muted-foreground hover:text-foreground text-sm shrink-0">
            ← Invoices
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">Invoice #{invoice.invoiceNumber}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-700"}`}>
            {invoice.status.replace(/_/g, " ")}
          </span>
          <InvoiceActions invoice={invoice} remaining={remaining} />
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Invoice Header */}
        <div className="p-6 md:p-8 border-b border-border bg-muted/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-bold text-foreground">{invoice.organization.name}</div>
              {invoice.organization.addressLine1 && (
                <div className="text-sm text-muted-foreground mt-1">
                  {invoice.organization.addressLine1}, {invoice.organization.city}, {invoice.organization.state}
                </div>
              )}
              {invoice.organization.phone && (
                <div className="text-sm text-muted-foreground">{invoice.organization.phone}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{formatCurrency(Number(invoice.totalAmount))}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Issued {formatDate(invoice.issueDate)}
              </div>
              {invoice.dueDate && (
                <div className={`text-sm mt-0.5 ${new Date() > invoice.dueDate && invoice.status !== "PAID" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  Due {formatDate(invoice.dueDate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Details */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 border-b border-border">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Bill To
            </div>
            <Link href={`/customers/${invoice.customer.id}`} className="hover:underline">
              <div className="font-medium text-foreground">
                {invoice.customer.firstName} {invoice.customer.lastName}
              </div>
            </Link>
            {invoice.customer.companyName && (
              <div className="text-sm text-foreground">{invoice.customer.companyName}</div>
            )}
            {invoice.customer.billingAddressLine1 && (
              <div className="text-sm text-muted-foreground mt-1">
                {invoice.customer.billingAddressLine1}
                <br />
                {invoice.customer.billingCity}, {invoice.customer.billingState} {invoice.customer.billingZip}
              </div>
            )}
            {invoice.customer.email && (
              <div className="text-sm text-muted-foreground">{invoice.customer.email}</div>
            )}
          </div>
          <div>
            {invoice.inspection?.property && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Service Location
                </div>
                <Link href={`/properties/${invoice.inspection.property.id}`} className="hover:underline">
                  <div className="font-medium text-foreground">{invoice.inspection.property.name}</div>
                </Link>
                <div className="text-sm text-muted-foreground">
                  {invoice.inspection.property.addressLine1}
                  <br />
                  {invoice.inspection.property.city}, {invoice.inspection.property.state} {invoice.inspection.property.zip}
                </div>
              </>
            )}
            {invoice.inspection && (
              <div className="mt-2">
                <Link
                  href={`/inspections/${invoice.inspection.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Inspection #{invoice.inspection.inspectionNumber}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="p-8 border-b border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3">
                  Description
                </th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 w-20">
                  Qty
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 w-28">
                  Unit Price
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 w-28">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-3">
                    <div className="text-sm font-medium text-foreground">{item.description}</div>
                  </td>
                  <td className="py-3 text-center text-sm text-foreground">{Number(item.quantity)}</td>
                  <td className="py-3 text-right text-sm text-foreground">
                    {formatCurrency(Number(item.unitPrice))}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-foreground">
                    {formatCurrency(Number(item.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-green-600">-{formatCurrency(Number(invoice.discountAmount))}</span>
                </div>
              )}
              {Number(invoice.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({(Number(invoice.taxRate) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-foreground">{formatCurrency(Number(invoice.taxAmount))}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span className="text-foreground">Total</span>
                <span className="text-foreground text-lg">{formatCurrency(Number(invoice.totalAmount))}</span>
              </div>
              {Number(invoice.paidAmount) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-green-600">-{formatCurrency(Number(invoice.paidAmount))}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-border pt-2">
                    <span className="text-foreground">Balance Due</span>
                    <span className={remaining > 0 ? "text-destructive text-lg" : "text-green-600 text-lg"}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-8 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Payment History
          </h2>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                    {p.referenceNumber && ` #${p.referenceNumber}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.processedAt ? formatDateTime(p.processedAt) : formatDate(p.createdAt)}
                  </div>
                  {p.notes && <div className="text-xs text-muted-foreground">{p.notes}</div>}
                </div>
                <div className="text-sm font-semibold text-green-600">
                  +{formatCurrency(Number(p.amount))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
