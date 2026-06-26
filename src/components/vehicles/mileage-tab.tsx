"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Gauge, Trash2 } from "lucide-react";

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

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

export function MileageTab({
  vehicleId,
  initialLogs,
  canEdit,
}: {
  vehicleId: string;
  initialLogs: MileageLog[];
  canEdit: boolean;
}) {
  const [logs, setLogs] = useState<MileageLog[]>(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const emptyForm = {
    date:        new Date().toISOString().slice(0, 10),
    startMileage: "",
    endMileage:   "",
    purpose:      "",
    destination:  "",
    notes:        "",
  };
  const [form, setForm] = useState(emptyForm);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const tripMiles = (log: MileageLog) => log.endMileage - log.startMileage;

  const totalMiles = logs.reduce((sum, l) => sum + (l.endMileage - l.startMileage), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(form.startMileage);
    const end   = parseInt(form.endMileage);
    if (isNaN(start) || isNaN(end) || end < start) {
      toast.error("End mileage must be greater than or equal to start mileage");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/mileage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:         form.date,
          startMileage: start,
          endMileage:   end,
          purpose:      form.purpose || null,
          destination:  form.destination || null,
          notes:        form.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setLogs((prev) => [j.data, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Trip logged");
    } catch {
      toast.error("Failed to log trip");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/mileage/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLogs((prev) => prev.filter((l) => l.id !== id));
      toast.success("Trip deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-foreground">{totalMiles.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">total miles logged</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-lg font-semibold text-foreground">{logs.length}</div>
            <div className="text-xs text-muted-foreground">trips recorded</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-lg font-semibold text-foreground">
              {logs.length > 0 ? Math.round(totalMiles / logs.length).toLocaleString() : 0}
            </div>
            <div className="text-xs text-muted-foreground">avg miles/trip</div>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Trip
            </button>
          ) : (
            <form onSubmit={handleAdd} className="w-full rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">New Mileage Entry</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" className={inputCls} value={form.date} onChange={set("date")} required />
                </div>
                <div>
                  <label className={labelCls}>Destination</label>
                  <input className={inputCls} value={form.destination} onChange={set("destination")} placeholder="e.g. Chicago, IL" />
                </div>
                <div>
                  <label className={labelCls}>Start Mileage *</label>
                  <input type="number" min="0" className={inputCls} value={form.startMileage} onChange={set("startMileage")} placeholder="e.g. 45000" required />
                </div>
                <div>
                  <label className={labelCls}>End Mileage *</label>
                  <input type="number" min="0" className={inputCls} value={form.endMileage} onChange={set("endMileage")} placeholder="e.g. 45312" required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Purpose / Job</label>
                  <input className={inputCls} value={form.purpose} onChange={set("purpose")} placeholder="e.g. Out-of-state inspection at Hilton — Chicago" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Notes</label>
                  <input className={inputCls} value={form.notes} onChange={set("notes")} placeholder="Any additional notes..." />
                </div>
              </div>
              {form.startMileage && form.endMileage && parseInt(form.endMileage) >= parseInt(form.startMileage) && (
                <p className="text-xs text-primary font-medium">
                  Trip distance: {(parseInt(form.endMileage) - parseInt(form.startMileage)).toLocaleString()} miles
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 h-8 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 h-8 bg-primary text-white rounded-md text-sm font-medium disabled:opacity-50">
                  {saving ? "Saving…" : "Log Trip"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {logs.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Gauge className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No mileage entries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const miles = tripMiles(log);
            return (
              <div key={log.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">
                        {format(new Date(log.date), "MMM d, yyyy")}
                      </span>
                      <span className="text-xs font-bold text-primary">{miles.toLocaleString()} mi</span>
                      {log.destination && (
                        <span className="text-xs text-muted-foreground">→ {log.destination}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{log.startMileage.toLocaleString()} → {log.endMileage.toLocaleString()}</span>
                      <span>· {log.user.firstName} {log.user.lastName}</span>
                    </div>
                    {log.purpose && <p className="mt-1 text-xs text-foreground">{log.purpose}</p>}
                    {log.appointment && (
                      <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 w-fit">
                        Job: {log.appointment.customer.companyName ?? `${log.appointment.customer.firstName} ${log.appointment.customer.lastName}`} — {log.appointment.property.city}, {log.appointment.property.state}
                      </div>
                    )}
                    {log.notes && <p className="mt-1 text-xs text-muted-foreground">{log.notes}</p>}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
