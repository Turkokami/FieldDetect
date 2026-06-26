"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  { value: "TRUCK",     label: "Truck" },
  { value: "VAN",       label: "Van" },
  { value: "SUV",       label: "SUV" },
  { value: "CAR",       label: "Car" },
  { value: "MOTORHOME", label: "Motorhome / RV" },
  { value: "TRAILER",   label: "Trailer" },
  { value: "OTHER",     label: "Other" },
];

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

type InitialData = {
  id: string;
  name: string;
  type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  licensePlate: string | null;
  vin: string | null;
  currentMileage: number;
  notes: string | null;
};

export function VehicleForm({ initial }: { initial?: InitialData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:           initial?.name ?? "",
    type:           initial?.type ?? "TRUCK",
    make:           initial?.make ?? "",
    model:          initial?.model ?? "",
    year:           initial?.year ? String(initial.year) : "",
    color:          initial?.color ?? "",
    licensePlate:   initial?.licensePlate ?? "",
    vin:            initial?.vin ?? "",
    currentMileage: initial?.currentMileage ? String(initial.currentMileage) : "0",
    notes:          initial?.notes ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:           form.name,
        type:           form.type,
        make:           form.make || null,
        model:          form.model || null,
        year:           form.year ? parseInt(form.year) : null,
        color:          form.color || null,
        licensePlate:   form.licensePlate || null,
        vin:            form.vin || null,
        currentMileage: parseInt(form.currentMileage) || 0,
        notes:          form.notes || null,
      };

      const url = initial ? `/api/vehicles/${initial.id}` : "/api/vehicles";
      const method = initial ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      const j = await res.json();

      toast.success(initial ? "Vehicle updated" : "Vehicle added");
      router.push(`/vehicles/${j.data.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Vehicle Name / Nickname *</label>
          <input className={inputCls} value={form.name} onChange={set("name")} required placeholder='e.g. "Unit 1 — Blue F-150"' />
        </div>

        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={form.type} onChange={set("type")}>
            {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Year</label>
          <input className={inputCls} type="number" min="1900" max="2100" value={form.year} onChange={set("year")} placeholder="e.g. 2022" />
        </div>

        <div>
          <label className={labelCls}>Make</label>
          <input className={inputCls} value={form.make} onChange={set("make")} placeholder="e.g. Ford" />
        </div>

        <div>
          <label className={labelCls}>Model</label>
          <input className={inputCls} value={form.model} onChange={set("model")} placeholder="e.g. F-150" />
        </div>

        <div>
          <label className={labelCls}>Color</label>
          <input className={inputCls} value={form.color} onChange={set("color")} placeholder="e.g. Blue" />
        </div>

        <div>
          <label className={labelCls}>License Plate</label>
          <input className={inputCls} value={form.licensePlate} onChange={set("licensePlate")} placeholder="ABC-1234" />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>VIN</label>
          <input className={inputCls} value={form.vin} onChange={set("vin")} placeholder="17-character VIN" maxLength={17} />
        </div>

        <div>
          <label className={labelCls}>Current Mileage</label>
          <input className={inputCls} type="number" min="0" value={form.currentMileage} onChange={set("currentMileage")} placeholder="0" />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
            value={form.notes}
            onChange={set("notes")}
            placeholder="Any additional notes about this vehicle..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !form.name}
          className="px-5 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Vehicle"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 h-9 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
