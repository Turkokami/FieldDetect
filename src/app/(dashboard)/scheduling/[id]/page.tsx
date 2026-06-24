import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import AppointmentActions from "@/components/scheduling/appointment-actions";

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const { created } = await searchParams;
  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: { include: { contacts: true } },
      property: { include: { buildings: { select: { id: true, name: true } } } },
      technician: true,
      k9Team: { include: { members: { include: { user: true } }, dogs: true } },
      inspection: {
        include: {
          inspectionUnits: {
            include: { photos: true },
            orderBy: { sortOrder: "asc" },
          },
          invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
        },
      },
    },
  });

  if (!appointment) notFound();

  const SERVICE_LABELS: Record<string, string> = {
    BED_BUG_INSPECTION: "Bed Bug Inspection",
    BED_BUG_TREATMENT: "Bed Bug Treatment",
    RODENT_INSPECTION: "Rodent Inspection",
    RODENT_EXCLUSION: "Rodent Exclusion",
    WILDLIFE_INSPECTION: "Wildlife Inspection",
    WILDLIFE_REMOVAL: "Wildlife Removal",
    BIRD_EXCLUSION: "Bird Exclusion",
    GOOSE_CONTROL: "Goose Control",
    GENERAL_PEST_INSPECTION: "General Pest Inspection",
    GENERAL_PEST_TREATMENT: "General Pest Treatment",
    OTHER: "Other",
  };

  const STATUS_COLORS: Record<string, string> = {
    REQUESTED: "bg-gray-100 text-gray-700 border-gray-200",
    SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
    CONFIRMED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    EN_ROUTE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ON_SITE: "bg-orange-100 text-orange-700 border-orange-200",
    INSPECTION_STARTED: "bg-purple-100 text-purple-700 border-purple-200",
    INSPECTION_COMPLETE: "bg-green-100 text-green-700 border-green-200",
    REPORT_SENT: "bg-teal-100 text-teal-700 border-teal-200",
    INVOICED: "bg-cyan-100 text-cyan-700 border-cyan-200",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    NO_SHOW: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {created && parseInt(created) > 1 && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ Recurring series created — <strong>{created} appointments</strong> scheduled.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/scheduling" className="text-muted-foreground hover:text-foreground text-sm">
            ← Scheduling
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">
            {appointment.title ?? SERVICE_LABELS[appointment.serviceType] ?? appointment.serviceType}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full border font-medium ${STATUS_COLORS[appointment.status] ?? "bg-gray-100 text-gray-700"}`}>
            {appointment.status.replace(/_/g, " ")}
          </span>
          <AppointmentActions appointment={{ ...appointment, userRole: user.role }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Appointment Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Service</dt>
                <dd className="text-sm text-foreground">{SERVICE_LABELS[appointment.serviceType]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Scheduled</dt>
                <dd className="text-sm text-foreground">{formatDateTime(appointment.scheduledDate)}</dd>
              </div>
              {appointment.scheduledEndTime && (
                <div>
                  <dt className="text-xs text-muted-foreground">End Time</dt>
                  <dd className="text-sm text-foreground">{formatDateTime(appointment.scheduledEndTime)}</dd>
                </div>
              )}
              {appointment.estimatedMinutes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Estimated Duration</dt>
                  <dd className="text-sm text-foreground">{appointment.estimatedMinutes} minutes</dd>
                </div>
              )}
              {appointment.actualStartTime && (
                <div>
                  <dt className="text-xs text-muted-foreground">Actual Start</dt>
                  <dd className="text-sm text-foreground">{formatDateTime(appointment.actualStartTime)}</dd>
                </div>
              )}
              {appointment.actualEndTime && (
                <div>
                  <dt className="text-xs text-muted-foreground">Actual End</dt>
                  <dd className="text-sm text-foreground">{formatDateTime(appointment.actualEndTime)}</dd>
                </div>
              )}
              {appointment.priority > 0 && (
                <div>
                  <dt className="text-xs text-muted-foreground">Priority</dt>
                  <dd>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${appointment.priority >= 2 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                      {appointment.priority >= 2 ? "Urgent" : "High"}
                    </span>
                  </dd>
                </div>
              )}
              {appointment.recurrence && (
                <div>
                  <dt className="text-xs text-muted-foreground">Recurrence</dt>
                  <dd className="text-sm text-foreground">
                    {appointment.recurrence.charAt(0) + appointment.recurrence.slice(1).toLowerCase()}
                    {appointment.recurrenceEndDate && (
                      <span className="text-muted-foreground"> until {formatDate(appointment.recurrenceEndDate)}</span>
                    )}
                  </dd>
                </div>
              )}
              {appointment.parentAppointmentId && (
                <div>
                  <dt className="text-xs text-muted-foreground">Part of series</dt>
                  <dd>
                    <Link href={`/scheduling/${appointment.parentAppointmentId}`} className="text-sm text-primary hover:underline">
                      View first appointment →
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Customer
            </h2>
            <Link
              href={`/customers/${appointment.customer.id}`}
              className="block hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="font-medium text-foreground">
                {appointment.customer.firstName} {appointment.customer.lastName}
              </div>
              {appointment.customer.companyName && (
                <div className="text-sm text-muted-foreground">{appointment.customer.companyName}</div>
              )}
              {appointment.customer.phone && (
                <div className="text-sm text-muted-foreground">{appointment.customer.phone}</div>
              )}
              {appointment.customer.email && (
                <div className="text-sm text-muted-foreground">{appointment.customer.email}</div>
              )}
            </Link>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Property
            </h2>
            <Link
              href={`/properties/${appointment.property.id}`}
              className="block hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="font-medium text-foreground">{appointment.property.name}</div>
              <div className="text-sm text-muted-foreground">{appointment.property.addressLine1}</div>
              <div className="text-sm text-muted-foreground">
                {appointment.property.city}, {appointment.property.state} {appointment.property.zip}
              </div>
            </Link>
            {appointment.accessNotes && (
              <div className="mt-3 pt-3 border-t border-border">
                <dt className="text-xs text-muted-foreground mb-1">Access Notes</dt>
                <dd className="text-sm text-foreground">{appointment.accessNotes}</dd>
              </div>
            )}
          </div>

          {appointment.technician && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Technician
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {appointment.technician.firstName[0]}{appointment.technician.lastName[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {appointment.technician.firstName} {appointment.technician.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{appointment.technician.email}</div>
                </div>
              </div>
            </div>
          )}

          {appointment.specialInstructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">Special Instructions</h2>
              <p className="text-sm text-amber-700">{appointment.specialInstructions}</p>
            </div>
          )}
        </div>

        {/* Inspection */}
        <div className="lg:col-span-2">
          {appointment.inspection ? (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Inspection #{appointment.inspection.inspectionNumber}
                </h2>
                <Link
                  href={`/inspections/${appointment.inspection.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Full Inspection →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{appointment.inspection.totalPositive}</div>
                  <div className="text-xs text-red-600">Positive</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{appointment.inspection.totalNegative}</div>
                  <div className="text-xs text-green-600">Negative</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-700">{appointment.inspection.totalInconclusive}</div>
                  <div className="text-xs text-yellow-600">Inconclusive</div>
                </div>
              </div>

              {appointment.inspection.overallResult && (
                <div className="mb-4">
                  <span className="text-xs text-muted-foreground">Overall Result: </span>
                  <span className={`text-sm font-medium ${
                    appointment.inspection.overallResult === "NEGATIVE" ? "text-green-700" :
                    ["POSITIVE_K9_ALERT", "VISUAL_CONFIRMATION"].includes(appointment.inspection.overallResult) ? "text-red-700" :
                    "text-yellow-700"
                  }`}>
                    {appointment.inspection.overallResult.replace(/_/g, " ")}
                  </span>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                {appointment.inspection.inspectionUnits.length} units inspected
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-semibold text-foreground mb-2">No Inspection Started</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start an inspection to record unit-by-unit results.
              </p>
              {["SCHEDULED", "CONFIRMED", "EN_ROUTE", "ON_SITE"].includes(appointment.status) && (
                <AppointmentActions appointment={appointment} variant="start-inspection" />
              )}
            </div>
          )}

          {/* Invoice section */}
          {["INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID"].includes(appointment.status) && (
            <div className="mt-4 bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Invoice</h2>
                {!appointment.inspection?.invoice && (
                  <Link
                    href={`/invoices/new?customerId=${appointment.customerId}&propertyId=${appointment.propertyId}${appointment.inspection ? `&inspectionId=${appointment.inspection.id}` : ""}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: "#0ABAB5" }}
                  >
                    + Create Invoice
                  </Link>
                )}
              </div>
              {appointment.inspection?.invoice ? (
                <Link
                  href={`/invoices/${appointment.inspection.invoice.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{appointment.inspection.invoice.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">{appointment.inspection.invoice.status}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{formatCurrency(appointment.inspection.invoice.totalAmount)}</div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No invoice yet. Create one to bill your customer.</p>
              )}
            </div>
          )}

          {appointment.description && (
            <div className="mt-4 bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-2 uppercase tracking-wide">Notes</h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">{appointment.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
