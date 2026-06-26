import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Truck, Plus } from "lucide-react";

export const metadata = { title: "Fleet" };

const VEHICLE_TYPE_ICONS: Record<string, string> = {
  TRUCK: "🚚", VAN: "🚐", SUV: "🚙", CAR: "🚗", MOTORHOME: "🚌", TRAILER: "🚛", OTHER: "🚘",
};
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:         { bg: "bg-green-100",  text: "text-green-700",  label: "Active" },
  IN_MAINTENANCE: { bg: "bg-amber-100",  text: "text-amber-700",  label: "In Maintenance" },
  INACTIVE:       { bg: "bg-slate-100",  text: "text-slate-500",  label: "Inactive" },
};

export default async function VehiclesPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    include: {
      _count: { select: { appointments: true, mileageLogs: true } },
      maintenance: { orderBy: { performedAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <Link
            href="/vehicles/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Link>
        )}
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No vehicles added yet</p>
          <p className="text-sm mt-1">Add trucks, vans, or motorhomes to track maintenance and mileage.</p>
          {canEdit && (
            <Link
              href="/vehicles/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Your First Vehicle
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const status = STATUS_STYLES[v.status] ?? STATUS_STYLES.ACTIVE;
            const lastService = v.maintenance[0];
            return (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                      {VEHICLE_TYPE_ICONS[v.type] ?? "🚘"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {v.name}
                      </h3>
                      {v.year && v.make && (
                        <p className="text-xs text-muted-foreground">{v.year} {v.make} {v.model ?? ""}</p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <div>
                    <span className="font-semibold text-foreground">{v.currentMileage.toLocaleString()}</span> mi
                  </div>
                  {v.licensePlate && (
                    <div className="px-1.5 py-0.5 bg-muted rounded font-mono text-foreground">{v.licensePlate}</div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span>{v._count.appointments} job{v._count.appointments !== 1 ? "s" : ""}</span>
                  <span>{v._count.mileageLogs} trip{v._count.mileageLogs !== 1 ? "s" : ""}</span>
                  {lastService && (
                    <span className="ml-auto text-[10px]">
                      Last service: {new Date(lastService.performedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
