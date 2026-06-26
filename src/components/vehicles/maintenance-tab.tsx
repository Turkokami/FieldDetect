"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Wrench, Trash2 } from "lucide-react";

const MAINTENANCE_TYPES = [
  { value: "OIL_CHANGE",          label: "Oil Change" },
  { value: "TIRE_ROTATION",       label: "Tire Rotation" },
  { value: "TIRE_REPLACEMENT",    label: "Tire Replacement" },
  { value: "BRAKE_SERVICE",       label: "Brake Service" },
  { value: "FLUID_TOP_UP",        label: "Fluid Top-up" },
  { value: "BATTERY_REPLACEMENT", label: "Battery Replacement" },
  { value: "INSPECTION",          label: "State/Safety Inspection" },
  { value: "REGISTRATION",        label: "Registration Renewal" },
  { value: "INSURANCE",           label: "Insurance" },
  { value: "REPAIR",              label: "Repair" },
  { value: "CLEANING",            label: "Cleaning / Detail" },
  { value: "OTHER",               label: "Other" },
];

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

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

const TYPE_LABEL: Record<string, string> = Object.fromEntries(MAINTENANCE_TYPES.map((t) => [t.value, t.label]));

export function MaintenanceTab({
  vehicleId,
  initialRecords,
  canEdit,
}: {
  vehicleId: string;
  initialRecords: MaintenanceRecord[];
  canEdit: boolean;
}) {
  const [records, setRecords] = useState<MaintenanceRecord[]>(initialRecords);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const emptyForm = {
    type: "OIL_CHANGE",
    description: "",
    performedAt: new Date().toISOString().slice(0, 10),
    mileageAtService: "",
    nextServiceMileage: "",
    nextServiceDate: "",
    cost: "",
    vendor: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type:               form.type,
          description:        form.description,
          performedAt:        form.performedAt,
          mileageAtService:   form.mileageAtService ? parseInt(form.mileageAtService) : null,
          nextServiceMileage: form.nextServiceMileage ? parseInt(form.nextServiceMileage) : null,
          nextServiceDate:    form.nextServiceDate || null,
          cost:               form.cost ? parseFloat(form.cost) : null,
          vendor:             form.vendor || null,
          notes:              form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setRecords((prev) => [j.data, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Maintenance record added");
    } catch {
      toast.error("Failed to add record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex justify-end">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Service
            </button>
          ) : (
            <form onSubmit={handleAdd} className="w-full rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">New Maintenance Record</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Service Type *</label>
                  <select className={inputCls} value={form.type} onChange={set("type")}>
                    {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls} value={form.performedAt} onChange={set("performedAt")} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description *</label>
                  <input className={inputCls} value={form.description} onChange={set("description")} placeholder="Brief description of service" required />
                </div>
                <div>
                  <label className={labelCls}>Mileage at Service</label>
                  <input type="number" min="0" className={inputCls} value={form.mileageAtService} onChange={set("mileageAtService")} placeholder="e.g. 45000" />
                </div>
                <div>
                  <label className={labelCls}>Cost ($)</label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.cost} onChange={set("cost")} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>Vendor / Shop</label>
                  <input className={inputCls} value={form.vendor} onChange={set("vendor")} placeholder="e.g. Jiffy Lube" />
                </div>
                <div>
                  <label className={labelCls}>Next Service Mileage</label>
                  <input type="number" min="0" className={inputCls} value={form.nextServiceMileage} onChange={set("nextServiceMileage")} placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className={labelCls}>Next Service Date</label>
                  <input type="date" className={inputCls} value={form.nextServiceDate} onChange={set("nextServiceDate")} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <input className={inputCls} value={form.notes} onChange={set("notes")} placeholder="Any additional notes..." />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 h-8 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving || !form.description} className="px-4 h-8 bg-primary text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving…" : "Save Record"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {records.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No maintenance records yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{r.description}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {TYPE_LABEL[r.type] ?? r.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{format(new Date(r.performedAt), "MMM d, yyyy")}</span>
                    {r.mileageAtService != null && <span>@ {r.mileageAtService.toLocaleString()} mi</span>}
                    {r.vendor && <span>· {r.vendor}</span>}
                    {r.cost != null && <span className="text-foreground font-medium">${r.cost.toFixed(2)}</span>}
                  </div>
                  {(r.nextServiceMileage || r.nextServiceDate) && (
                    <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 w-fit">
                      Next service:
                      {r.nextServiceMileage && ` ${r.nextServiceMileage.toLocaleString()} mi`}
                      {r.nextServiceDate && ` · ${format(new Date(r.nextServiceDate), "MMM d, yyyy")}`}
                    </div>
                  )}
                  {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
