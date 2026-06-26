"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Trash2, ChevronLeft } from "lucide-react";
import { MaintenanceTab } from "./maintenance-tab";
import { MileageTab } from "./mileage-tab";

const VEHICLE_TYPE_ICONS: Record<string, string> = {
  TRUCK: "🚚", VAN: "🚐", SUV: "🚙", CAR: "🚗", MOTORHOME: "🚌", TRAILER: "🚛", OTHER: "🚘",
};
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  TRUCK: "Truck", VAN: "Van", SUV: "SUV", CAR: "Car", MOTORHOME: "Motorhome / RV", TRAILER: "Trailer", OTHER: "Other",
};
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:         { bg: "bg-green-100",  text: "text-green-700",  label: "Active" },
  IN_MAINTENANCE: { bg: "bg-amber-100",  text: "text-amber-700",  label: "In Maintenance" },
  INACTIVE:       { bg: "bg-slate-100",  text: "text-slate-500",  label: "Inactive" },
};

type MaintenanceRecord = {
  id: string;
  type: string;
  description: string;
  performedAt: string | Date;
  mileageAtService: number | null;
  nextServiceMileage: number | null;
  nextServiceDate: string | Date | null;
  cost: number | null;
  vendor: string | null;
  notes: string | null;
};

type MileageLog = {
  id: string;
  date: string | Date;
  startMileage: number;
  endMileage: number;
  purpose: string | null;
  destination: string | null;
  notes: string | null;
  user: { id: string; firstName: string; lastName: string };
  appointment: {
    id: string;
    scheduledDate: string | Date;
    customer: { firstName: string; lastName: string; companyName: string | null };
    property: { name: string; city: string; state: string };
  } | null;
};

type Appointment = {
  id: string;
  scheduledDate: string | Date;
  status: string;
  customer: { firstName: string; lastName: string; companyName: string | null };
  property: { name: string; city: string; state: string };
  technician: { firstName: string; lastName: string } | null;
};

type Vehicle = {
  id: string;
  name: string;
  type: string;
  status: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  licensePlate: string | null;
  vin: string | null;
  currentMileage: number;
  notes: string | null;
  maintenance: MaintenanceRecord[];
  mileageLogs: MileageLog[];
  appointments: Appointment[];
  _count: { appointments: number; mileageLogs: number };
};

type Tab = "overview" | "maintenance" | "mileage" | "jobs";

export function VehicleProfileClient({
  vehicle,
  canEdit,
}: {
  vehicle: Vehicle;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [changingStatus, setChangingStatus] = useState(false);

  const status = STATUS_STYLES[vehicle.status] ?? STATUS_STYLES.ACTIVE;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview",    label: "Overview" },
    { id: "maintenance", label: "Maintenance", count: vehicle.maintenance.length },
    { id: "mileage",     label: "Mileage Log",  count: vehicle.mileageLogs.length },
    { id: "jobs",        label: "Jobs",          count: vehicle._count.appointments },
  ];

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Archive this vehicle? It will no longer appear in the fleet list.")) return;
    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Vehicle archived");
      router.push("/vehicles");
      router.refresh();
    } catch {
      toast.error("Failed to archive vehicle");
    }
  };

  const totalMilesLogged = vehicle.mileageLogs.reduce((sum, l) => sum + (l.endMileage - l.startMileage), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/vehicles" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Fleet
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{vehicle.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shrink-0">
            {VEHICLE_TYPE_ICONS[vehicle.type] ?? "🚘"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{vehicle.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {vehicle.year && vehicle.make && vehicle.model && (
                <span className="text-sm text-muted-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">{VEHICLE_TYPE_LABELS[vehicle.type]}</span>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            {vehicle.status !== "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                disabled={changingStatus}
                className="px-3 h-8 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
              >
                Mark Active
              </button>
            )}
            {vehicle.status !== "IN_MAINTENANCE" && (
              <button
                onClick={() => handleStatusChange("IN_MAINTENANCE")}
                disabled={changingStatus}
                className="px-3 h-8 bg-amber-100 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-200 transition-colors"
              >
                Mark In Maintenance
              </button>
            )}
            <Link
              href={`/vehicles/${vehicle.id}/edit`}
              className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3" /> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Archive
            </button>
          </div>
        )}
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">{vehicle.currentMileage.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Current Mileage</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">{totalMilesLogged.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Miles Logged</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">{vehicle._count.appointments}</div>
          <div className="text-xs text-muted-foreground">Jobs Assigned</div>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
          <div className="text-lg font-bold text-foreground">{vehicle.maintenance.length}</div>
          <div className="text-xs text-muted-foreground">Service Records</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Vehicle Details</h3>
            {[
              ["Type",          VEHICLE_TYPE_LABELS[vehicle.type]],
              ["Year",          vehicle.year],
              ["Make",          vehicle.make],
              ["Model",         vehicle.model],
              ["Color",         vehicle.color],
              ["License Plate", vehicle.licensePlate],
              ["VIN",           vehicle.vin],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={String(label)} className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                <span className="text-foreground font-medium">{String(value)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {/* Next service alert */}
            {vehicle.maintenance.length > 0 && (() => {
              const upcoming = vehicle.maintenance.find((m) => m.nextServiceDate || m.nextServiceMileage);
              if (!upcoming) return null;
              return (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Next Scheduled Service</p>
                  <p className="text-sm font-medium text-amber-900">{upcoming.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-amber-700">
                    {upcoming.nextServiceMileage && <span>{upcoming.nextServiceMileage.toLocaleString()} mi</span>}
                    {upcoming.nextServiceDate && <span>{format(new Date(upcoming.nextServiceDate), "MMM d, yyyy")}</span>}
                  </div>
                </div>
              );
            })()}

            {vehicle.notes && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{vehicle.notes}</p>
              </div>
            )}

            {/* Recent trips */}
            {vehicle.mileageLogs.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Trips</p>
                <div className="space-y-1.5">
                  {vehicle.mileageLogs.slice(0, 3).map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{format(new Date(l.date), "MMM d")}{l.destination ? ` → ${l.destination}` : ""}</span>
                      <span className="font-semibold text-foreground">{(l.endMileage - l.startMileage).toLocaleString()} mi</span>
                    </div>
                  ))}
                </div>
                {vehicle.mileageLogs.length > 3 && (
                  <button onClick={() => setTab("mileage")} className="text-xs text-primary mt-2 hover:underline">
                    View all {vehicle.mileageLogs.length} trips →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "maintenance" && (
        <MaintenanceTab
          vehicleId={vehicle.id}
          initialRecords={vehicle.maintenance}
          canEdit={canEdit}
        />
      )}

      {tab === "mileage" && (
        <MileageTab
          vehicleId={vehicle.id}
          initialLogs={vehicle.mileageLogs}
          canEdit={canEdit}
        />
      )}

      {tab === "jobs" && (
        <div className="space-y-2">
          {vehicle.appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">No jobs assigned to this vehicle yet</p>
            </div>
          ) : (
            vehicle.appointments.map((apt) => {
              const customer = apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;
              return (
                <Link
                  key={apt.id}
                  href={`/scheduling?apt=${apt.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all text-sm"
                >
                  <div>
                    <div className="font-medium text-foreground">{customer}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {apt.property.name} · {apt.property.city}, {apt.property.state}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">{format(new Date(apt.scheduledDate), "MMM d, yyyy")}</div>
                    {apt.technician && (
                      <div className="text-xs text-muted-foreground">{apt.technician.firstName} {apt.technician.lastName}</div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
