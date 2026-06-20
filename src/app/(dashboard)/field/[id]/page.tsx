import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import FieldInspectionView from "@/components/field/field-inspection-view";

export default async function FieldAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: true,
      property: {
        include: {
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
        },
      },
      inspection: {
        include: {
          inspectionUnits: {
            include: { photos: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!appointment) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground text-sm">{appointment.property.name}</div>
            <div className="text-xs text-muted-foreground">
              {appointment.property.addressLine1}, {appointment.property.city}
            </div>
          </div>
          <div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              appointment.status === "INSPECTION_COMPLETE" ? "bg-green-100 text-green-700" :
              appointment.status === "INSPECTION_STARTED" ? "bg-purple-100 text-purple-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {appointment.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Quick Info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Scheduled</div>
              <div className="font-medium text-foreground">{formatDateTime(appointment.scheduledDate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div className="font-medium text-foreground">
                {appointment.customer.firstName} {appointment.customer.lastName}
              </div>
              {appointment.customer.phone && (
                <a
                  href={`tel:${appointment.customer.phone}`}
                  className="text-xs text-primary hover:underline"
                >
                  {appointment.customer.phone}
                </a>
              )}
            </div>
          </div>
          {appointment.accessNotes && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Access Notes</div>
              <div className="text-sm text-foreground">{appointment.accessNotes}</div>
            </div>
          )}
          {appointment.specialInstructions && (
            <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
              <div className="text-xs font-medium text-amber-700 mb-1">Special Instructions</div>
              <div className="text-sm text-amber-800">{appointment.specialInstructions}</div>
            </div>
          )}
        </div>

        {/* Inspection Area */}
        <FieldInspectionView appointment={appointment} />

        {/* Back to full view */}
        <div className="text-center pb-4">
          <Link href={`/scheduling/${id}`} className="text-sm text-muted-foreground hover:underline">
            View full appointment details →
          </Link>
        </div>
      </div>
    </div>
  );
}
