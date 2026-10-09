"use client";

import { useMemo, useState } from "react";
import { Archive, GripVertical, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { UNIT_LABELS, type CatalogUnit } from "@/lib/product-catalog";

export type PriceListProduct = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: CatalogUnit;
  unitPrice: number;
  unitCost?: number | null;
  isActive: boolean;
  sortOrder: number;
};

const UNITS = Object.keys(UNIT_LABELS) as CatalogUnit[];
const UNCATEGORIZED = "Uncategorized";
const input = "h-8 rounded-md border border-input bg-background px-2 text-sm w-full";

function margin(price: number, cost: number | null | undefined) {
  if (cost == null || price <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function PriceListClient({
  initialProducts,
  canEdit,
}: {
  initialProducts: PriceListProduct[];
  canEdit: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", unit: "EACH" as CatalogUnit, unitPrice: "", unitCost: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const visible = products.filter((p) => showArchived || p.isActive);
    const map = new Map<string, PriceListProduct[]>();
    for (const p of visible) {
      const key = p.category || UNCATEGORIZED;
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [products, showArchived]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort(),
    [products]
  );

  const replace = (p: PriceListProduct) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));

  const update = async (p: PriceListProduct, patch: Partial<PriceListProduct>) => {
    const before = p;
    replace({ ...p, ...patch });
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    } catch (err) {
      replace(before);
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const numberPatch = (p: PriceListProduct, field: "unitPrice" | "unitCost", raw: string) => {
    const trimmed = raw.trim();
    if (field === "unitCost" && trimmed === "") {
      if (p.unitCost != null) update(p, { unitCost: null });
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) { toast.error("Enter a price of 0 or more"); return; }
    if (value !== p[field]) update(p, { [field]: value });
  };

  const add = async () => {
    const sku = form.sku || slugify(form.name);
    if (!form.name.trim() || !sku || form.unitPrice === "") { toast.error("Name and price are required"); return; }
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sku,
          category: form.category.trim() || null,
          unit: form.unit,
          unitPrice: Number(form.unitPrice),
          unitCost: form.unitCost === "" ? null : Number(form.unitCost),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setProducts((prev) => [...prev, json.data]);
      setForm({ name: "", sku: "", category: form.category, unit: "EACH", unitPrice: "", unitCost: "" });
      toast.success("Product added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    }
  };

  const loadDefaults = async (set: "exclusion" | "holiday-samples") => {
    try {
      const res = await fetch("/api/products/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      const list = await fetch("/api/products?includeArchived=1").then((r) => r.json());
      setProducts(list.data);
      toast.success(json.data.added ? `Added ${json.data.added} product(s)` : "Everything was already on your list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load defaults");
    }
  };

  const dropOn = async (target: PriceListProduct) => {
    const dragged = products.find((p) => p.id === dragId);
    setDragId(null);
    if (!dragged || dragged.id === target.id || (dragged.category || "") !== (target.category || "")) return;
    const group = products
      .filter((p) => (p.category || "") === (target.category || ""))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .filter((p) => p.id !== dragged.id);
    group.splice(group.findIndex((p) => p.id === target.id), 0, dragged);
    const order = new Map(group.map((p, i) => [p.id, i]));
    const before = products;
    setProducts((prev) => prev.map((p) => (order.has(p.id) ? { ...p, sortOrder: order.get(p.id)! } : p)));
    try {
      const res = await fetch("/api/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: group.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setProducts(before);
      toast.error("Reorder failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <>
            <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 px-3 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Add product
            </button>
            <button type="button" onClick={() => loadDefaults("exclusion")} className="px-3 h-9 rounded-md text-sm font-medium border border-border hover:bg-muted">
              Add exclusion defaults
            </button>
            <button type="button" onClick={() => loadDefaults("holiday-samples")} className="px-3 h-9 rounded-md text-sm font-medium border border-border hover:bg-muted">
              Add holiday-lighting samples
            </button>
          </>
        )}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {adding && canEdit && (
        <div className="bg-card border border-border rounded-xl p-4 grid gap-2 sm:grid-cols-6">
          <input className={`${input} sm:col-span-2`} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder={form.name ? slugify(form.name) : "sku"} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className={input} placeholder="Category" list="price-list-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <datalist id="price-list-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <select className={input} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as CatalogUnit })}>
            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
          <input className={input} placeholder="Price" inputMode="decimal" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
          <input className={input} placeholder="Cost (internal)" inputMode="decimal" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
          <div className="sm:col-span-5" />
          <button type="button" onClick={add} className="h-8 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90">Save</button>
        </div>
      )}

      {groups.length === 0 && (
        <div className="bg-card border border-border rounded-xl px-5 py-10 text-center text-sm text-muted-foreground">
          No products yet. {canEdit ? "Add one, or load the defaults above." : ""}
        </div>
      )}

      {groups.map(([category, items]) => (
        <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-foreground">{category}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  {canEdit && <th className="w-6" />}
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">SKU</th>
                  <th className="px-2 py-2 font-medium">Unit</th>
                  <th className="px-2 py-2 font-medium text-right">Price</th>
                  {canEdit && <th className="px-2 py-2 font-medium text-right">Cost</th>}
                  {canEdit && <th className="px-2 py-2 font-medium text-right">Margin</th>}
                  {canEdit && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => {
                  const m = margin(p.unitPrice, p.unitCost);
                  return (
                    <tr
                      key={`${p.id}-${p.sortOrder}`}
                      className={`${p.isActive ? "" : "opacity-50"} ${dragId === p.id ? "bg-muted" : ""}`}
                      draggable={canEdit && p.isActive}
                      onDragStart={() => setDragId(p.id)}
                      onDragOver={(e) => canEdit && e.preventDefault()}
                      onDrop={() => dropOn(p)}
                    >
                      {canEdit && (
                        <td className="pl-2 text-muted-foreground cursor-grab"><GripVertical className="h-4 w-4" /></td>
                      )}
                      <td className="px-2 py-1.5 min-w-[180px]">
                        {canEdit ? (
                          <input className={input} defaultValue={p.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.name) update(p, { name: v }); }} />
                        ) : p.name}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.sku}</td>
                      <td className="px-2 py-1.5 min-w-[100px]">
                        {canEdit ? (
                          <select className={input} value={p.unit} onChange={(e) => update(p, { unit: e.target.value as CatalogUnit })}>
                            {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                          </select>
                        ) : UNIT_LABELS[p.unit]}
                      </td>
                      <td className="px-2 py-1.5 text-right min-w-[90px]">
                        {canEdit ? (
                          <input className={`${input} text-right`} inputMode="decimal" defaultValue={p.unitPrice} onBlur={(e) => numberPatch(p, "unitPrice", e.target.value)} />
                        ) : `$${p.unitPrice.toFixed(2)}`}
                      </td>
                      {canEdit && (
                        <td className="px-2 py-1.5 text-right min-w-[90px]">
                          <input className={`${input} text-right`} inputMode="decimal" placeholder="—" defaultValue={p.unitCost ?? ""} onBlur={(e) => numberPatch(p, "unitCost", e.target.value)} />
                        </td>
                      )}
                      {canEdit && (
                        <td className={`px-2 py-1.5 text-right whitespace-nowrap ${m != null && m < 30 ? "text-red-600" : "text-muted-foreground"}`}>
                          {m == null ? "—" : `${m}%`}
                        </td>
                      )}
                      {canEdit && (
                        <td className="px-2 py-1.5 text-right">
                          {p.isActive ? (
                            <button type="button" title="Archive" onClick={() => update(p, { isActive: false })} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : (
                            <button type="button" title="Restore" onClick={() => update(p, { isActive: true })} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
