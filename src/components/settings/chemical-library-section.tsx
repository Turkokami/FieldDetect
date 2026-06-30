"use client";

import { useState } from "react";
import { toast } from "sonner";

type Chemical = {
  id: string;
  name: string;
  epaRegNumber: string | null;
  activeIngredient: string | null;
  signalWord: string | null;
  targetPests: string[];
  notes: string | null;
};

const SIGNAL_COLORS: Record<string, string> = {
  CAUTION: "#eab308",
  WARNING: "#f97316",
  DANGER: "#ef4444",
};

const emptyForm = {
  name: "",
  epaRegNumber: "",
  activeIngredient: "",
  signalWord: "",
  targetPests: "",
  notes: "",
};

type Props = {
  initialChemicals: Chemical[];
  canEdit: boolean;
};

export function ChemicalLibrarySection({ initialChemicals, canEdit }: Props) {
  const [chemicals, setChemicals] = useState<Chemical[]>(initialChemicals);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const setEdit = (field: string, value: string) => setEditForm((f) => ({ ...f, [field]: value }));

  const parsePests = (s: string) =>
    s.split(",").map((p) => p.trim()).filter(Boolean);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Chemical name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/chemicals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          epaRegNumber: form.epaRegNumber.trim() || null,
          activeIngredient: form.activeIngredient.trim() || null,
          signalWord: form.signalWord || null,
          targetPests: parsePests(form.targetPests),
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChemicals((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setShowAdd(false);
      toast.success("Chemical added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add chemical");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (chem: Chemical) => {
    setEditingId(chem.id);
    setEditForm({
      name: chem.name,
      epaRegNumber: chem.epaRegNumber ?? "",
      activeIngredient: chem.activeIngredient ?? "",
      signalWord: chem.signalWord ?? "",
      targetPests: chem.targetPests.join(", "),
      notes: chem.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chemicals/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          epaRegNumber: editForm.epaRegNumber.trim() || null,
          activeIngredient: editForm.activeIngredient.trim() || null,
          signalWord: editForm.signalWord || null,
          targetPests: parsePests(editForm.targetPests),
          notes: editForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChemicals((prev) =>
        prev.map((c) => (c.id === editingId ? data.data : c)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      toast.success("Chemical updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const deleteChemical = async (id: string) => {
    if (!confirm("Remove this chemical? If it has usage history it will be deactivated instead of deleted.")) return;
    try {
      const res = await fetch(`/api/chemicals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setChemicals((prev) => prev.filter((c) => c.id !== id));
      toast.success("Chemical removed");
    } catch {
      toast.error("Failed to remove chemical");
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const ChemForm = ({
    values,
    onChange,
    onSave,
    onCancel,
    isSaving,
    saveLabel,
  }: {
    values: typeof emptyForm;
    onChange: (f: string, v: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    saveLabel: string;
  }) => (
    <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Chemical Name *</label>
          <input type="text" value={values.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Termidor SC" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">EPA Reg. Number</label>
          <input type="text" value={values.epaRegNumber} onChange={(e) => onChange("epaRegNumber", e.target.value)} placeholder="e.g. 73049-429" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Active Ingredient</label>
          <input type="text" value={values.activeIngredient} onChange={(e) => onChange("activeIngredient", e.target.value)} placeholder="e.g. Fipronil 9.1%" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Signal Word</label>
          <select value={values.signalWord} onChange={(e) => onChange("signalWord", e.target.value)} className={inputCls}>
            <option value="">None / Not labeled</option>
            <option value="CAUTION">CAUTION</option>
            <option value="WARNING">WARNING</option>
            <option value="DANGER">DANGER</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Pests</label>
          <input type="text" value={values.targetPests} onChange={(e) => onChange("targetPests", e.target.value)} placeholder="Termites, Ants, Roaches (comma separated)" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
          <input type="text" value={values.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Optional internal notes" className={inputCls} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted">Cancel</button>
        <button type="button" onClick={onSave} disabled={isSaving} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60">
          {isSaving ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {canEdit && !showAdd && (
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full justify-center"
        >
          + Add Chemical
        </button>
      )}

      {showAdd && (
        <ChemForm
          values={form}
          onChange={set}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
          isSaving={saving}
          saveLabel="Add Chemical"
        />
      )}

      {chemicals.length === 0 && !showAdd && (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          <div className="text-3xl mb-2">🧪</div>
          <p>No chemicals in your library yet.</p>
          {canEdit && <p className="mt-1">Add chemicals to enable logging on job records.</p>}
        </div>
      )}

      {chemicals.map((chem) => (
        <div key={chem.id} className="rounded-xl border border-border bg-card overflow-hidden">
          {editingId === chem.id ? (
            <div className="p-4">
              <ChemForm
                values={editForm}
                onChange={setEdit}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
                isSaving={saving}
                saveLabel="Save Changes"
              />
            </div>
          ) : (
            <div className="px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-foreground">{chem.name}</span>
                  {chem.signalWord && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ background: SIGNAL_COLORS[chem.signalWord] ?? "#6b7280" }}
                    >
                      {chem.signalWord}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  {chem.epaRegNumber && (
                    <span className="text-xs text-muted-foreground">EPA Reg: <strong className="text-foreground">{chem.epaRegNumber}</strong></span>
                  )}
                  {chem.activeIngredient && (
                    <span className="text-xs text-muted-foreground">A.I.: <strong className="text-foreground">{chem.activeIngredient}</strong></span>
                  )}
                </div>
                {chem.targetPests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {chem.targetPests.map((p) => (
                      <span key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{p}</span>
                    ))}
                  </div>
                )}
                {chem.notes && <p className="text-xs text-muted-foreground mt-1">{chem.notes}</p>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(chem)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">Edit</button>
                  <button onClick={() => deleteChemical(chem.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-muted">Remove</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
