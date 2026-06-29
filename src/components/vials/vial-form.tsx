"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

type InitialData = {
  id: string;
  name: string;
  colony: string | null;
  source: string | null;
  acquisitionDate: string;
  status: string;
  notes: string | null;
};

export function VialForm({ initial }: { initial?: InitialData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name:            initial?.name ?? "",
    colony:          initial?.colony ?? "",
    source:          initial?.source ?? "",
    acquisitionDate: initial?.acquisitionDate
      ? initial.acquisitionDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    status:          initial?.status ?? "ACTIVE",
    notes:           initial?.notes ?? "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name:            form.name,
        colony:          form.colony || null,
        source:          form.source || null,
        acquisitionDate: new Date(form.acquisitionDate).toISOString(),
        status:          form.status,
        notes:           form.notes || null,
      };

      const url = initial ? `/api/vials/${initial.id}` : "/api/vials";
      const method = initial ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      const j = await res.json();

      toast.success(initial ? "Vial updated" : "Vial added");
      router.push(`/vials/${j.data.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to save vial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Vial Name / ID *</label>
          <input className={inputCls} value={form.name} onChange={set("name")} required placeholder='e.g. "Colony A — Vial 1"' />
        </div>

        <div>
          <label className={labelCls}>Colony</label>
          <input className={inputCls} value={form.colony} onChange={set("colony")} placeholder="e.g. Colony A" />
        </div>

        <div>
          <label className={labelCls}>Source</label>
          <input className={inputCls} value={form.source} onChange={set("source")} placeholder="e.g. Supplier name" />
        </div>

        <div>
          <label className={labelCls}>Acquisition Date</label>
          <input className={inputCls} type="date" value={form.acquisitionDate} onChange={set("acquisitionDate")} />
        </div>

        {initial && (
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={set("status")}>
              <option value="ACTIVE">Active</option>
              <option value="RETIRED">Retired</option>
              <option value="DEAD">Dead</option>
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            rows={3}
            value={form.notes}
            onChange={set("notes")}
            placeholder="Any additional notes about this vial..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !form.name}
          className="px-5 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : initial ? "Save Changes" : "Add Vial"}
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
