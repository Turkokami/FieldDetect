"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, CheckSquare, Square, RotateCcw, PackageCheck } from "lucide-react";
import { format } from "date-fns";

type EquipmentItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isRequired: boolean;
  isTravel: boolean;
};

type CheckoutItem = {
  id: string;
  equipmentItemId: string;
  isCheckedOut: boolean;
  isReturned: boolean;
  condition: string | null;
  notes: string | null;
  equipmentItem: EquipmentItem;
};

type Checkout = {
  id: string;
  date: string | Date;
  checkedOutAt: string | Date | null;
  returnedAt: string | Date | null;
  notes: string | null;
  user: { firstName: string; lastName: string };
  items: CheckoutItem[];
};

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export function EquipmentTab({
  entityId,
  entityType,
  canEdit,
}: {
  entityId: string;
  entityType: "dog" | "handler";
  canEdit: boolean;
}) {
  const basePath = entityType === "dog"
    ? `/api/k9dogs/${entityId}/equipment-checkouts`
    : `/api/handlers/${entityId}/equipment-checkouts`;

  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [activeCheckout, setActiveCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [listFilter, setListFilter] = useState<"standard" | "travel">("standard");
  const [saving, setSaving] = useState(false);

  const fetchCheckouts = async () => {
    setLoading(true);
    try {
      const res = await fetch(basePath);
      if (!res.ok) throw new Error();
      const j = await res.json();
      const list: Checkout[] = j.data ?? [];
      setCheckouts(list);
      // most recent with no returnedAt = active
      const active = list.find((c) => !c.returnedAt);
      setActiveCheckout(active ?? null);
    } catch {
      toast.error("Failed to load equipment checkouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCheckouts(); }, [entityId]);

  const startCheckout = async () => {
    setSaving(true);
    try {
      const res = await fetch(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      const newCheckout: Checkout = j.data;
      setCheckouts((prev) => [newCheckout, ...prev]);
      setActiveCheckout(newCheckout);
      setCreatingNew(false);
      toast.success("Equipment checklist created");
    } catch {
      toast.error("Failed to create checklist");
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (checkout: Checkout, item: CheckoutItem, field: "isCheckedOut" | "isReturned") => {
    const newVal = !item[field];
    const patchItems = [{ id: item.id, [field]: newVal }];

    try {
      const res = await fetch(`/api/equipment-checkouts/${checkout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: patchItems }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      const updated: Checkout = j.data;
      setCheckouts((prev) => prev.map((c) => c.id === checkout.id ? updated : c));
      if (activeCheckout?.id === checkout.id) setActiveCheckout(updated);
    } catch {
      toast.error("Failed to update item");
    }
  };

  const markReturned = async (checkout: Checkout) => {
    try {
      const res = await fetch(`/api/equipment-checkouts/${checkout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnedAt: new Date().toISOString(),
          items: checkout.items.map((i) => ({ id: i.id, isReturned: true })),
        }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      const updated: Checkout = j.data;
      setCheckouts((prev) => prev.map((c) => c.id === checkout.id ? updated : c));
      setActiveCheckout(null);
      toast.success("All equipment marked as returned");
    } catch {
      toast.error("Failed to mark returned");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading equipment data…</p>;
  }

  return (
    <div className="space-y-5">
      {/* List type toggle */}
      <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5 w-fit">
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

      {/* Active Checkout */}
      {activeCheckout ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold text-foreground">Active Checklist</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {format(new Date(activeCheckout.date), "MMM d, yyyy")} · {activeCheckout.user.firstName} {activeCheckout.user.lastName}
              </span>
            </div>
            {canEdit && (
              <button
                onClick={() => markReturned(activeCheckout)}
                className="flex items-center gap-1.5 px-3 h-8 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Mark All Returned
              </button>
            )}
          </div>

          <div className="space-y-1">
            {activeCheckout.items.filter((i) => (listFilter === "travel" ? i.equipmentItem.isTravel : !i.equipmentItem.isTravel)).length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {listFilter === "travel"
                  ? "No travel/out-of-state items configured. Ask an admin to add travel items in Settings."
                  : "No daily equipment items configured. Ask an admin to set up equipment items in Settings."}
              </p>
            )}
            {activeCheckout.items.filter((i) => (listFilter === "travel" ? i.equipmentItem.isTravel : !i.equipmentItem.isTravel)).map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  {canEdit ? (
                    <button
                      onClick={() => toggleItem(activeCheckout, item, "isCheckedOut")}
                      className={`text-${item.isCheckedOut ? "primary" : "muted-foreground"} hover:text-primary transition-colors`}
                    >
                      {item.isCheckedOut ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  ) : (
                    item.isCheckedOut ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.equipmentItem.name}</div>
                    {item.equipmentItem.category && (
                      <div className="text-xs text-muted-foreground">{item.equipmentItem.category}</div>
                    )}
                  </div>
                  {item.equipmentItem.isRequired && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-semibold">Required</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs text-muted-foreground w-20 text-right">
                    {item.isCheckedOut ? <span className="text-primary font-medium">Checked out</span> : "Not checked out"}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => toggleItem(activeCheckout, item, "isReturned")}
                      className={`flex items-center gap-1 px-2 h-6 rounded text-[10px] font-medium transition-colors ${
                        item.isReturned
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      {item.isReturned ? "Returned" : "Return"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <PackageCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No active equipment checklist</p>
          {canEdit && !creatingNew && (
            <button
              onClick={() => setCreatingNew(true)}
              className="flex items-center gap-1.5 px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors mx-auto"
            >
              <Plus className="h-4 w-4" />
              Start Checkout
            </button>
          )}
        </div>
      )}

      {creatingNew && (
        <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              className={inputCls}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <button
            onClick={startCheckout}
            disabled={saving}
            className="px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => setCreatingNew(false)}
            className="px-4 h-9 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* History */}
      {checkouts.filter((c) => c.returnedAt).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">Checkout History</h4>
          <div className="space-y-2">
            {checkouts.filter((c) => c.returnedAt).slice(0, 10).map((c) => {
              const checkedOut = c.items.filter((i) => i.isCheckedOut).length;
              const returned   = c.items.filter((i) => i.isReturned).length;
              const total      = c.items.length;
              return (
                <div key={c.id} className="flex items-center justify-between py-2 px-4 rounded-lg border border-border/50 text-sm">
                  <div>
                    <span className="font-medium text-foreground">{format(new Date(c.date), "MMM d, yyyy")}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.user.firstName} {c.user.lastName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {checkedOut}/{total} out · {returned}/{total} returned
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
