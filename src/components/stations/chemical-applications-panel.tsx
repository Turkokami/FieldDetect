"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type Chemical = {
  id: string;
  name: string;
  epaRegNumber: string | null;
  activeIngredient: string | null;
  signalWord: string | null;
};

type Application = {
  id: string;
  chemical: Chemical;
  mixRatio: string | null;
  amountUsed: number | null;
  unit: string | null;
  applicationMethod: string | null;
  targetPest: string | null;
  treatmentArea: string | null;
  appliedAt: string;
  notes: string | null;
  appliedBy: { firstName: string; lastName: string } | null;
};

const SIGNAL_COLORS: Record<string, string> = {
  CAUTION: "#eab308",
  WARNING: "#f97316",
  DANGER: "#ef4444",
};

const UNITS = ["oz", "fl oz", "ml", "L", "gal", "lbs", "g", "kg"];
const METHODS = ["Spray", "Bait", "Dust", "Inject", "Gel", "Granule", "Fog", "Other"];

type Props = {
  appointmentId: string;
  propertyId?: string;
  initialApplications?: Application[];
};

export function ChemicalApplicationsPanel({ appointmentId, propertyId, initialApplications = [] }: Props) {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    chemicalId: "",
    mixRatio: "",
    amountUsed: "",
    unit: "oz",
    applicationMethod: "",
    targetPest: "",
    treatmentArea: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/chemicals")
      .then((r) => r.json())
      .then((d) => setChemicals(d.data ?? []));
  }, []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const logApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chemicalId) { toast.error("Select a chemical"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/chemical-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chemicalId: form.chemicalId,
          appointmentId,
          propertyId: propertyId ?? null,
          mixRatio: form.mixRatio || null,
          amountUsed: form.amountUsed ? parseFloat(form.amountUsed) : null,
          unit: form.unit || null,
          applicationMethod: form.applicationMethod || null,
          targetPest: form.targetPest || null,
          treatmentArea: form.treatmentArea || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApplications((prev) => [data.data, ...prev]);
      setShowForm(false);
      setForm({ chemicalId: "", mixRatio: "", amountUsed: "", unit: "oz", applicationMethod: "", targetPest: "", treatmentArea: "", notes: "" });
      toast.success("Chemical application logged");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log application");
    } finally {
      setSaving(false);
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Remove this chemical application record?")) return;
    try {
      const res = await fetch(`/api/chemical-applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const selectedChem = chemicals.find((c) => c.id === form.chemicalId);
  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🧪</span>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Chemical Usage</h3>
          {applications.length > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {applications.length}
            </span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
          >
            + Log Chemical
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={logApplication} className="p-4 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Chemical *</label>
              {chemicals.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No chemicals in your library.{" "}
                  <a href="/settings" className="text-primary hover:underline">Add chemicals in Settings.</a>
                </div>
              ) : (
                <select value={form.chemicalId} onChange={(e) => set("chemicalId", e.target.value)} required className={inputCls}>
                  <option value="">Select chemical…</option>
                  {chemicals.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.epaRegNumber ? ` (EPA: ${c.epaRegNumber})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {selectedChem && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {selectedChem.activeIngredient && <span>A.I.: {selectedChem.activeIngredient}</span>}
                  {selectedChem.signalWord && (
                    <span
                      className="px-1.5 py-0.5 rounded font-bold text-white text-[10px]"
                      style={{ background: SIGNAL_COLORS[selectedChem.signalWord] ?? "#6b7280" }}
                    >
                      {selectedChem.signalWord}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Mix Ratio</label>
              <input
                type="text"
                value={form.mixRatio}
                onChange={(e) => set("mixRatio", e.target.value)}
                placeholder="e.g. 2 oz per gallon"
                className={inputCls}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount Used</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountUsed}
                  onChange={(e) => set("amountUsed", e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => set("unit", e.target.value)} className={inputCls}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Application Method</label>
              <select value={form.applicationMethod} onChange={(e) => set("applicationMethod", e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Pest</label>
              <input
                type="text"
                value={form.targetPest}
                onChange={(e) => set("targetPest", e.target.value)}
                placeholder="e.g. Rodents, Termites"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Treatment Area</label>
              <input
                type="text"
                value={form.treatmentArea}
                onChange={(e) => set("treatmentArea", e.target.value)}
                placeholder="e.g. Perimeter, Attic, Unit 3B"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={saving || chemicals.length === 0} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60">
              {saving ? "Saving…" : "Log Application"}
            </button>
          </div>
        </form>
      )}

      {applications.length > 0 ? (
        <div className="divide-y divide-border">
          {applications.map((app) => (
            <div key={app.id} className="px-5 py-3 flex items-start gap-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{app.chemical.name}</span>
                  {app.chemical.epaRegNumber && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      EPA {app.chemical.epaRegNumber}
                    </span>
                  )}
                  {app.chemical.signalWord && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ background: SIGNAL_COLORS[app.chemical.signalWord] ?? "#6b7280" }}
                    >
                      {app.chemical.signalWord}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {app.mixRatio && <span className="text-xs text-muted-foreground">Mix: {app.mixRatio}</span>}
                  {app.amountUsed != null && (
                    <span className="text-xs text-muted-foreground">
                      Used: {app.amountUsed} {app.unit}
                    </span>
                  )}
                  {app.applicationMethod && <span className="text-xs text-muted-foreground">Method: {app.applicationMethod}</span>}
                  {app.targetPest && <span className="text-xs text-muted-foreground">Target: {app.targetPest}</span>}
                  {app.treatmentArea && <span className="text-xs text-muted-foreground">Area: {app.treatmentArea}</span>}
                </div>
                {app.notes && <p className="text-xs text-muted-foreground mt-0.5">{app.notes}</p>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(app.appliedAt).toLocaleDateString()}
                  {app.appliedBy && ` · ${app.appliedBy.firstName} ${app.appliedBy.lastName}`}
                </div>
              </div>
              <button
                onClick={() => deleteApplication(app.id)}
                className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <div className="text-3xl mb-2">🧪</div>
          <p>No chemical applications logged for this job.</p>
        </div>
      )}
    </div>
  );
}
