"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ShieldAlert } from "lucide-react";

type EquipmentItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isRequired: boolean;
  isTravel: boolean;
  sortOrder: number;
  isActive: boolean;
};

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

const CATEGORIES = ["Harness & Vest", "Leash & Collar", "Detection Tools", "Medical", "Safety", "Documentation", "Technology", "Other"];

export default function EquipmentItemsSection({
  initialItems,
}: {
  initialItems: EquipmentItem[];
}) {
  const [items, setItems] = useState<EquipmentItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [listFilter, setListFilter] = useState<"standard" | "travel">("standard");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    isRequired: false,
    isTravel: false,
  });
  const [saving, setSaving] = useState(false);

  const addItem = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/equipment-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category: form.category || null,
          isRequired: form.isRequired,
          isTravel: form.isTravel,
          sortOrder: items.length,
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setItems((prev) => [...prev, j.data]);
      setForm({ name: "", description: "", category: "", isRequired: false, isTravel: false });
      setShowAdd(false);
      toast.success("Equipment item added");
    } catch {
      toast.error("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/equipment-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const toggleRequired = async (item: EquipmentItem) => {
    try {
      const res = await fetch(`/api/equipment-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRequired: !item.isRequired }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isRequired: !i.isRequired } : i));
    } catch {
      toast.error("Failed to update item");
    }
  };

  const filteredItems = items.filter((i) => (listFilter === "travel" ? i.isTravel : !i.isTravel));

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const matching = filteredItems.filter((i) => i.category === cat);
    if (matching.length > 0) acc[cat] = matching;
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  const uncategorized = filteredItems.filter((i) => !i.category || !CATEGORIES.includes(i.category));

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setListFilter("standard")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${listFilter === "standard" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Daily Field Work
          </button>
          <button
            onClick={() => setListFilter("travel")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${listFilter === "travel" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Out-of-State / Travel
          </button>
        </div>
        <button
          onClick={() => { setForm((f) => ({ ...f, isTravel: listFilter === "travel" })); setShowAdd(true); }}
          className="flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Item
        </button>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        {listFilter === "travel"
          ? "Items techs need to pack for overnight or out-of-state trips."
          : "Items checked out before and returned after each field inspection."}
      </p>

      {showAdd && (
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className={labelCls}>Item Name *</label>
              <input type="text" className={inputCls} placeholder="e.g. K9 Harness" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Uncategorized</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Description</label>
              <input type="text" className={inputCls} placeholder="Optional description" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.isRequired}
                  onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
                Mark as required
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={form.isTravel}
                  onChange={(e) => setForm((f) => ({ ...f, isTravel: e.target.checked }))} />
                Out-of-state / Travel item
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
          <GripVertical className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No equipment items yet.</p>
          <p className="text-xs text-muted-foreground">Add items that techs should check out before and return after field work.</p>
        </div>
      )}

      {[...Object.entries(grouped), ...(uncategorized.length ? [["Uncategorized", uncategorized] as [string, EquipmentItem[]]] : [])].map(([cat, catItems]) => (
        <div key={cat}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</div>
          <div className="space-y-1">
            {catItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                  {item.description && <div className="text-xs text-muted-foreground truncate">{item.description}</div>}
                </div>
                <button
                  onClick={() => toggleRequired(item)}
                  className={`flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium transition-colors ${
                    item.isRequired
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={item.isRequired ? "Click to remove required flag" : "Click to mark as required"}
                >
                  <ShieldAlert className="h-2.5 w-2.5" />
                  {item.isRequired ? "Required" : "Optional"}
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
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
