import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: { include: { contacts: true } },
      buildings: {
        include: {
          units: { orderBy: [{ floor: "asc" }, { unitNumber: "asc" }] },
        },
        orderBy: { name: "asc" },
      },
      units: {
        where: { buildingId: null },
        orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
      },
      appointments: {
        include: {
          technician: { select: { firstName: true, lastName: true } },
          inspection: { select: { id: true, inspectionNumber: true, overallResult: true } },
        },
        orderBy: { scheduledDate: "desc" },
        take: 15,
      },
      _count: { select: { units: true, appointments: true, inspections: true } },
    },
  });

  if (!property) notFound();

  const STATUS_COLORS: Record<string, string> = {
    REQUESTED: "bg-gray-100 text-gray-700",
    SCHEDULED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-indigo-100 text-indigo-700",
    INSPECTION_COMPLETE: "bg-green-100 text-green-700",
    PAID: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
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

  const totalUnits =
    property.units.length +
    property.buildings.reduce((s, b) => s + b.units.length, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="text-muted-foreground hover:text-foreground text-sm">
            ← Properties
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
        </div>
        <Link
          href={`/scheduling/new?propertyId=${property.id}&customerId=${property.customerId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Schedule Inspection
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Property Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd className="text-sm text-foreground">
                  {property.addressLine1}
                  {property.addressLine2 && <>, {property.addressLine2}</>}
                  <br />
                  {property.city}, {property.state} {property.zip}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="text-sm text-foreground">
                  {property.propertyType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </dd>
              </div>
              {property.totalUnits && (
                <div>
                  <dt className="text-xs text-muted-foreground">Total Units</dt>
                  <dd className="text-sm text-foreground">{property.totalUnits}</dd>
                </div>
              )}
              {property.totalBuildings && (
                <div>
                  <dt className="text-xs text-muted-foreground">Buildings</dt>
                  <dd className="text-sm text-foreground">{property.totalBuildings}</dd>
                </div>
              )}
              {property.gateCode && (
                <div>
                  <dt className="text-xs text-muted-foreground">Gate Code</dt>
                  <dd className="text-sm font-mono text-foreground">{property.gateCode}</dd>
                </div>
              )}
              {property.accessNotes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Access Notes</dt>
                  <dd className="text-sm text-foreground">{property.accessNotes}</dd>
                </div>
              )}
              {property.parkingNotes && (
                <div>
                  <dt className="text-xs text-muted-foreground">Parking</dt>
                  <dd className="text-sm text-foreground">{property.parkingNotes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Customer */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
              Customer
            </h2>
            <Link
              href={`/customers/${property.customer.id}`}
              className="block hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="font-medium text-foreground">
                {property.customer.firstName} {property.customer.lastName}
              </div>
              {property.customer.companyName && (
                <div className="text-sm text-muted-foreground">{property.customer.companyName}</div>
              )}
              {property.customer.phone && (
                <div className="text-sm text-muted-foreground">{property.customer.phone}</div>
              )}
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{totalUnits}</div>
              <div className="text-xs text-muted-foreground">Units</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{property._count.appointments}</div>
              <div className="text-xs text-muted-foreground">Appts</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{property._count.inspections}</div>
              <div className="text-xs text-muted-foreground">Inspections</div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buildings & Units */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Buildings &amp; Units
              </h2>
              <Link
                href={`/properties/${property.id}/units`}
                className="text-xs text-primary hover:underline"
              >
                Manage Units →
              </Link>
            </div>

            {property.buildings.length === 0 && property.units.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No units defined yet.</p>
                <Link
                  href={`/properties/${property.id}/units`}
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  Add units →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {property.buildings.map((building) => (
                  <div key={building.id}>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      {building.name}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({building.units.length} units)
                      </span>
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
                      {building.units.map((unit) => (
                        <div
                          key={unit.id}
                          className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground"
                        >
                          {unit.unitNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {property.units.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      Units
                      <span className="text-xs text-muted-foreground ml-1">
                        ({property.units.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
                      {property.units.map((unit) => (
                        <div
                          key={unit.id}
                          className="aspect-square flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs font-medium text-foreground"
                        >
                          {unit.unitNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
              Appointment History
            </h2>
            {property.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments yet.</p>
            ) : (
              <div className="space-y-2">
                {property.appointments.map((appt) => (
                  <Link
                    key={appt.id}
                    href={`/scheduling/${appt.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {formatDate(appt.scheduledDate)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {appt.technician
                          ? `${appt.technician.firstName} ${appt.technician.lastName}`
                          : "Unassigned"}
                      </div>
                      {appt.inspection?.overallResult && (
                        <div className={`text-xs mt-0.5 ${RESULT_COLORS[appt.inspection.overallResult] ?? ""}`}>
                          {appt.inspection.overallResult.replace(/_/g, " ")}
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
        </div>
      </div>
    </div>
  );
}
