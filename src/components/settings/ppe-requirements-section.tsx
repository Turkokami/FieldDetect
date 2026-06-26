"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck } from "lucide-react";

type PPERequirement = {
  id: string;
  facilityType: string;
  name: string;
  description: string | null;
  isForHandler: boolean;
  isForDog: boolean;
};

const FACILITY_TYPES = [
  { value: "SINGLE_FAMILY",    label: "Single Family Home" },
  { value: "MULTI_FAMILY",     label: "Multi-Family" },
  { value: "APARTMENT_COMPLEX",label: "Apartment Complex" },
  { value: "HOTEL",            label: "Hotel / Motel" },
  { value: "MOTEL",            label: "Motel" },
  { value: "DORMITORY",        label: "Dormitory" },
  { value: "ASSISTED_LIVING",  label: "Assisted Living" },
  { value: "NURSING_HOME",     label: "Nursing Home" },
  { value: "OFFICE",           label: "Office" },
  { value: "WAREHOUSE",        label: "Warehouse" },
  { value: "RETAIL",           label: "Retail" },
  { value: "RESTAURANT",       label: "Restaurant" },
  { value: "SCHOOL",           label: "School" },
  { value: "HOSPITAL",         label: "Hospital" },
  { value: "GOVERNMENT",       label: "Government" },
  { value: "OTHER",            label: "Other" },
];

const FACILITY_LABEL: Record<string, string> = Object.fromEntries(
  FACILITY_TYPES.map(({ value, label }) => [value, label])
);

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

export default function PPERequirementsSection({
  initialItems,
}: {
  initialItems: PPERequirement[];
}) {
  const [items, setItems] = useState<PPERequirement[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    facilityType: "HOTEL",
    name: "",
    description: "",
    isForHandler: true,
    isForDog: false,
  });
  const [saving, setSaving] = useState(false);

  const addItem = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ppe-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityType: form.facilityType,
          name: form.name,
          description: form.description || null,
          isForHandler: form.isForHandler,
          isForDog: form.isForDog,
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setItems((prev) => [...prev, j.data]);
      setForm({ facilityType: "HOTEL", name: "", description: "", isForHandler: true, isForDog: false });
      setShowAdd(false);
      toast.success("PPE requirement added");
    } catch {
      toast.error("Failed to add requirement");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/ppe-requirements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Requirement removed");
    } catch {
      toast.error("Failed to remove requirement");
    }
  };

  // Group by facility type
  const grouped = FACILITY_TYPES.reduce((acc, ft) => {
    const matching = items.filter((i) => i.facilityType === ft.value);
    if (matching.length > 0) acc[ft.value] = matching;
    return acc;
  }, {} as Record<string, PPERequirement[]>);

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          PPE requirements appear as reminders on the calendar day view when a technician has an appointment at that facility type.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add PPE Rule
        </button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Facility Type *</label>
              <select className={inputCls} value={form.facilityType}
                onChange={(e) => setForm((f) => ({ ...f, facilityType: e.target.value }))}>
                {FACILITY_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>PPE Item / Requirement *</label>
              <input type="text" className={inputCls} placeholder="e.g. N95 Respirator, Shoe Covers"
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description / Notes</label>
              <input type="text" className={inputCls} placeholder="Optional context" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.isForHandler}
                  onChange={(e) => setForm((f) => ({ ...f, isForHandler: e.target.checked }))} />
                Required for Handler
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.isForDog}
                  onChange={(e) => setForm((f) => ({ ...f, isForDog: e.target.checked }))} />
                Required for Dog
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={saving} className="px-4 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 h-8 border border-border rounded-md text-xs text-muted-foreground hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !showAdd && (
        <div className="py-8 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No PPE requirements configured.</p>
          <p className="text-xs text-muted-foreground">Add rules to remind techs what PPE to bring for specific facility types.</p>
        </div>
      )}

      {Object.entries(grouped).map(([facilityType, reqs]) => (
        <div key={facilityType}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {FACILITY_LABEL[facilityType] ?? facilityType}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-1">
            {reqs.map((req) => (
              <div key={req.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border/50">
                <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{req.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {req.description && <span className="text-xs text-muted-foreground">{req.description}</span>}
                    <div className="flex gap-2">
                      {req.isForHandler && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Handler</span>
                      )}
                      {req.isForDog && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Dog</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteItem(req.id)}
                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
