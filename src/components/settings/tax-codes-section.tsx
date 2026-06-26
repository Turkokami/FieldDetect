"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

type TaxCode = {
  id: string;
  name: string;
  description: string | null;
  rate: number;
  city: string | null;
  state: string | null;
  isDefault: boolean;
};

type Props = {
  initialTaxCodes: TaxCode[];
  canEdit: boolean;
};

const emptyForm = { name: "", description: "", rate: "", city: "", state: "", isDefault: false };

export default function TaxCodesSection({ initialTaxCodes, canEdit }: Props) {
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>(initialTaxCodes);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.rate) { toast.error("Name and rate are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tax-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          rate: parseFloat(form.rate),
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
          isDefault: form.isDefault,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      setTaxCodes((prev) => {
        const updated = form.isDefault ? prev.map((c) => ({ ...c, isDefault: false })) : prev;
        return [...updated, data.data];
      });
      setForm(emptyForm);
      setShowAdd(false);
      toast.success("Tax code added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add tax code");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tc: TaxCode) => {
    setEditingId(tc.id);
    setEditForm({
      name: tc.name,
      description: tc.description ?? "",
      rate: String(tc.rate),
      city: tc.city ?? "",
      state: tc.state ?? "",
      isDefault: tc.isDefault,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.rate) { toast.error("Name and rate are required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tax-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          rate: parseFloat(editForm.rate),
          city: editForm.city.trim() || null,
          state: editForm.state.trim().toUpperCase() || null,
          isDefault: editForm.isDefault,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      setTaxCodes((prev) => {
        const updated = editForm.isDefault ? prev.map((c) => ({ ...c, isDefault: false })) : prev;
        return updated.map((c) => (c.id === id ? data.data : c));
      });
      setEditingId(null);
      toast.success("Tax code updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tax code?")) return;
    try {
      const res = await fetch(`/api/tax-codes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTaxCodes((prev) => prev.filter((c) => c.id !== id));
      toast.success("Tax code deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {taxCodes.length === 0 && !showAdd ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">No tax codes yet. Add one to auto-apply rates by city or state.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Tax Code
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {taxCodes.map((tc) => (
              <div key={tc.id} className="px-5 py-4">
                {editingId === tc.id ? (
                  <TaxCodeForm
                    form={editForm}
                    setForm={setEditForm}
                    onSave={() => handleSaveEdit(tc.id)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{tc.name}</span>
                        <span className="text-sm font-bold text-primary">{tc.rate}%</span>
                        {tc.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Default</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[tc.city, tc.state].filter(Boolean).join(", ") || "All locations"}
                        {tc.description && <span className="ml-2">· {tc.description}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(tc)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tc.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAdd && (
            <div className="px-5 py-4 border-t border-border bg-muted/30">
              <TaxCodeForm
                form={form}
                setForm={setForm}
                onSave={handleAdd}
                onCancel={() => { setShowAdd(false); setForm(emptyForm); }}
                saving={saving}
              />
            </div>
          )}

          {canEdit && !showAdd && (
            <div className="px-5 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Tax Code
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TaxCodeForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const field = (name: keyof typeof emptyForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [name]: value }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="e.g. CA State Tax"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Rate (%) *</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.001"
            value={form.rate}
            onChange={(e) => field("rate", e.target.value)}
            placeholder="8.25"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">City (optional)</label>
          <input
            value={form.city}
            onChange={(e) => field("city", e.target.value)}
            placeholder="Los Angeles"
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">State (optional)</label>
          <input
            value={form.state}
            onChange={(e) => field("state", e.target.value)}
            placeholder="CA"
            maxLength={2}
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
        <input
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
          placeholder="Sales tax for California"
          className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => field("isDefault", e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm text-foreground">Set as default tax code</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 h-8 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 h-8 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
