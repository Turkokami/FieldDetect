import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatPhone, formatCurrency } from "@/lib/utils";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      contacts: true,
      properties: {
        where: { isActive: true },
        include: { _count: { select: { units: true } } },
      },
      appointments: {
        include: {
          property: { select: { name: true, addressLine1: true } },
          technician: { select: { firstName: true, lastName: true } },
          inspection: { select: { id: true, inspectionNumber: true, overallResult: true } },
        },
        orderBy: { scheduledDate: "desc" },
        take: 20,
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { appointments: true, invoices: true, properties: true } },
    },
  });

  if (!customer) notFound();

  const totalBilled = customer.invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPaid = customer.invoices.reduce((s, i) => s + Number(i.paidAmount), 0);

  const STATUS_COLORS: Record<string, string> = {
    REQUESTED: "bg-gray-100 text-gray-700",
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    EN_ROUTE: "bg-yellow-100 text-yellow-700",
    ON_SITE: "bg-orange-100 text-orange-700",
    INSPECTION_STARTED: "bg-purple-100 text-purple-700",
    INSPECTION_COMPLETE: "bg-green-100 text-green-700",
    REPORT_SENT: "bg-teal-100 text-teal-700",
    INVOICED: "bg-cyan-100 text-cyan-700",
    PAID: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
    NO_SHOW: "bg-rose-100 text-rose-700",
  };

  const RESULT_COLORS: Record<string, string> = {
    NEGATIVE: "text-green-700",
    POSITIVE_K9_ALERT: "text-red-700",
    VISUAL_CONFIRMATION: "text-red-600",
    INCONCLUSIVE: "text-yellow-700",
    UNABLE_TO_INSPECT: "text-gray-500",
    ACCESS_DENIED: "text-orange-600",
    FOLLOW_UP_REQUIRED: "text-blue-600",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="text-muted-foreground hover:text-foreground">
            ← Customers
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">
            {customer.firstName} {customer.lastName}
            {customer.companyName && (
              <span className="text-lg font-normal text-muted-foreground ml-2">
                — {customer.companyName}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/scheduling/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Schedule Appointment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Contact Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="text-sm text-foreground capitalize">
                  {customer.customerType.replace(/_/g, " ").toLowerCase()}
                </dd>
              </div>
              {customer.email && (
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>
                    <a href={`mailto:${customer.email}`} className="text-sm text-primary hover:underline">
                      {customer.email}
                    </a>
                  </dd>
                </div>
              )}
              {customer.phone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd className="text-sm text-foreground">{formatPhone(customer.phone)}</dd>
                </div>
              )}
              {customer.altPhone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Alt Phone</dt>
                  <dd className="text-sm text-foreground">{formatPhone(customer.altPhone)}</dd>
                </div>
              )}
              {customer.billingAddressLine1 && (
                <div>
                  <dt className="text-xs text-muted-foreground">Billing Address</dt>
                  <dd className="text-sm text-foreground">
                    {customer.billingAddressLine1}
                    {customer.billingAddressLine2 && <>, {customer.billingAddressLine2}</>}
                    <br />
                    {customer.billingCity}, {customer.billingState} {customer.billingZip}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Account Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{customer._count.appointments}</div>
                <div className="text-xs text-muted-foreground">Appointments</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">{customer._count.properties}</div>
                <div className="text-xs text-muted-foreground">Properties</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-foreground">{formatCurrency(totalBilled)}</div>
                <div className="text-xs text-muted-foreground">Total Billed</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-foreground">{formatCurrency(totalPaid)}</div>
                <div className="text-xs text-muted-foreground">Total Paid</div>
              </div>
            </div>
          </div>

          {/* Properties */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Properties
              </h2>
              <Link
                href={`/properties/new?customerId=${customer.id}`}
                className="text-xs text-primary hover:underline"
              >
                + Add
              </Link>
            </div>
            {customer.properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">No properties yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.properties.map((p) => (
                  <Link
                    key={p.id}
                    href={`/properties/${p.id}`}
                    className="block p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.addressLine1}, {p.city}</div>
                    {p._count.units > 0 && (
                      <div className="text-xs text-muted-foreground">{p._count.units} units</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {customer.notes && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">Notes</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Appointments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Appointments
              </h2>
              <Link
                href={`/scheduling/new?customerId=${customer.id}`}
                className="text-xs text-primary hover:underline"
              >
                + Schedule
              </Link>
            </div>
            {customer.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.appointments.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/scheduling/${appt.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {appt.property?.name ?? "Unknown Property"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(appt.scheduledDate)}
                        {appt.technician && (
                          <> · {appt.technician.firstName} {appt.technician.lastName}</>
                        )}
                      </div>
                      {appt.inspection && (
                        <div className={`text-xs mt-0.5 ${RESULT_COLORS[appt.inspection.overallResult ?? ""] ?? "text-muted-foreground"}`}>
                          {appt.inspection.overallResult?.replace(/_/g, " ") ?? ""}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {appt.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Invoices
              </h2>
              <Link
                href={`/invoices/new?customerId=${customer.id}`}
                className="text-xs text-primary hover:underline"
              >
                + Create Invoice
              </Link>
            </div>
            {customer.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {customer.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        #{inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatCurrency(Number(inv.totalAmount))}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inv.status === "PAID" ? "bg-green-100 text-green-700" :
                        inv.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                        inv.status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
