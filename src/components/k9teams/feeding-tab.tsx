"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Clock } from "lucide-react";

type Meal = "MORNING" | "AFTERNOON" | "EVENING";
type MedMeal = Meal | "ALL_MEALS";

type FeedingSchedule = {
  id: string;
  morningEnabled: boolean;
  morningTime: string | null;
  morningAmount: string | null;
  afternoonEnabled: boolean;
  afternoonTime: string | null;
  afternoonAmount: string | null;
  eveningEnabled: boolean;
  eveningTime: string | null;
  eveningAmount: string | null;
  notes: string | null;
};

type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  meal: MedMeal;
  notes: string | null;
};

type RecipeItem = {
  id: string;
  ingredient: string;
  amount: string;
  unit: string;
  sortOrder: number;
};

const MEAL_LABELS: Record<MedMeal, string> = {
  MORNING:   "Morning",
  AFTERNOON: "Afternoon",
  EVENING:   "Evening",
  ALL_MEALS: "All Meals",
};

const UNIT_OPTIONS = ["cups", "scoops", "tablespoons", "teaspoons", "oz", "g", "pieces", "ml"];

const inputCls = "w-full h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

export function FeedingTab({ dogId, canEdit }: { dogId: string; canEdit: boolean }) {
  const [schedule, setSchedule] = useState<Partial<FeedingSchedule>>({
    morningEnabled: false, morningTime: "", morningAmount: "",
    afternoonEnabled: false, afternoonTime: "", afternoonAmount: "",
    eveningEnabled: false, eveningTime: "", eveningAmount: "",
    notes: "",
  });
  const [medications, setMedications] = useState<Medication[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [addingMed, setAddingMed] = useState(false);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [medForm, setMedForm] = useState({ name: "", dosage: "", meal: "MORNING" as MedMeal, notes: "" });
  const [recipeForm, setRecipeForm] = useState({ ingredient: "", amount: "", unit: "cups" });

  useEffect(() => {
    fetch(`/api/k9dogs/${dogId}/feeding`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.schedule) setSchedule(j.data.schedule);
        if (j.data?.medications) setMedications(j.data.medications);
        if (j.data?.recipeItems) setRecipeItems(j.data.recipeItems);
      })
      .catch(() => toast.error("Failed to load feeding data"));
  }, [dogId]);

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/k9dogs/${dogId}/feeding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) throw new Error();
      toast.success("Feeding schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const addMedication = async () => {
    if (!medForm.name.trim()) return;
    try {
      const res = await fetch(`/api/k9dogs/${dogId}/feeding/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medForm),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setMedications((prev) => [...prev, j.data]);
      setMedForm({ name: "", dosage: "", meal: "MORNING", notes: "" });
      setAddingMed(false);
      toast.success("Medication added");
    } catch {
      toast.error("Failed to add medication");
    }
  };

  const deleteMedication = async (id: string) => {
    try {
      await fetch(`/api/k9dogs/${dogId}/feeding/medications/${id}`, { method: "DELETE" });
      setMedications((prev) => prev.filter((m) => m.id !== id));
      toast.success("Medication removed");
    } catch {
      toast.error("Failed to remove medication");
    }
  };

  const addRecipeItem = async () => {
    if (!recipeForm.ingredient.trim() || !recipeForm.amount.trim()) return;
    try {
      const res = await fetch(`/api/k9dogs/${dogId}/feeding/recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recipeForm, sortOrder: recipeItems.length }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setRecipeItems((prev) => [...prev, j.data]);
      setRecipeForm({ ingredient: "", amount: "", unit: "cups" });
      setAddingRecipe(false);
      toast.success("Recipe ingredient added");
    } catch {
      toast.error("Failed to add ingredient");
    }
  };

  const deleteRecipeItem = async (id: string) => {
    try {
      await fetch(`/api/k9dogs/${dogId}/feeding/recipe/${id}`, { method: "DELETE" });
      setRecipeItems((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Failed to remove ingredient");
    }
  };

  const MealCard = ({
    meal, label, enabledKey, timeKey, amountKey,
  }: {
    meal: Meal;
    label: string;
    enabledKey: keyof FeedingSchedule;
    timeKey: keyof FeedingSchedule;
    amountKey: keyof FeedingSchedule;
  }) => {
    const enabled = schedule[enabledKey] as boolean | undefined;
    return (
      <div className={`rounded-xl border p-4 transition-colors ${enabled ? "border-primary/30 bg-primary/5" : "border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{meal === "MORNING" ? "🌅" : meal === "AFTERNOON" ? "☀️" : "🌙"}</span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          {canEdit && (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!enabled}
                onChange={(e) => setSchedule((s) => ({ ...s, [enabledKey]: e.target.checked }))}
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          )}
        </div>
        {enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Time</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="time"
                  disabled={!canEdit}
                  className={`${inputCls} pl-8`}
                  value={(schedule[timeKey] as string) ?? ""}
                  onChange={(e) => setSchedule((s) => ({ ...s, [timeKey]: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. 2 cups"
                className={inputCls}
                value={(schedule[amountKey] as string) ?? ""}
                onChange={(e) => setSchedule((s) => ({ ...s, [amountKey]: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">Daily Feeding Schedule</h4>
          {canEdit && (
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Schedule"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MealCard meal="MORNING"   label="Morning"   enabledKey="morningEnabled"   timeKey="morningTime"   amountKey="morningAmount" />
          <MealCard meal="AFTERNOON" label="Afternoon" enabledKey="afternoonEnabled" timeKey="afternoonTime" amountKey="afternoonAmount" />
          <MealCard meal="EVENING"   label="Evening"   enabledKey="eveningEnabled"   timeKey="eveningTime"   amountKey="eveningAmount" />
        </div>
        {canEdit && (
          <div className="mt-3">
            <label className={labelCls}>Additional Notes</label>
            <textarea
              rows={2}
              disabled={!canEdit}
              placeholder="Special feeding instructions…"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={schedule.notes ?? ""}
              onChange={(e) => setSchedule((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">Medications with Food</h4>
          {canEdit && (
            <button
              onClick={() => setAddingMed(true)}
              className="flex items-center gap-1 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Medication
            </button>
          )}
        </div>

        {addingMed && (
          <div className="mb-3 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Medication Name *</label>
                <input type="text" className={inputCls} placeholder="e.g. Bravecto" value={medForm.name}
                  onChange={(e) => setMedForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Dosage</label>
                <input type="text" className={inputCls} placeholder="e.g. 1 tablet" value={medForm.dosage}
                  onChange={(e) => setMedForm((f) => ({ ...f, dosage: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Given With</label>
                <select className={inputCls} value={medForm.meal}
                  onChange={(e) => setMedForm((f) => ({ ...f, meal: e.target.value as MedMeal }))}>
                  {(Object.keys(MEAL_LABELS) as MedMeal[]).map((m) => (
                    <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <input type="text" className={inputCls} placeholder="Extra instructions" value={medForm.notes}
                  onChange={(e) => setMedForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addMedication} className="px-4 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90">Add</button>
              <button onClick={() => setAddingMed(false)} className="px-4 h-8 border border-border rounded-md text-xs text-muted-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        )}

        {medications.length === 0 && !addingMed ? (
          <p className="text-sm text-muted-foreground italic">No medications recorded.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Medication</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Dosage</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Given With</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Notes</th>
                  {canEdit && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {medications.map((med) => (
                  <tr key={med.id} className="border-t border-border/50">
                    <td className="px-4 py-2.5 font-medium text-foreground">{med.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{med.dosage ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{MEAL_LABELS[med.meal]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{med.notes ?? "—"}</td>
                    {canEdit && (
                      <td className="px-2 py-2.5">
                        <button onClick={() => deleteMedication(med.id)} className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Food Mix Recipe */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Custom Food Mix Recipe</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Build the exact meal mix for this dog</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddingRecipe(true)}
              className="flex items-center gap-1 px-3 h-8 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Ingredient
            </button>
          )}
        </div>

        {addingRecipe && (
          <div className="mb-3 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 md:col-span-1">
                <label className={labelCls}>Ingredient *</label>
                <input type="text" className={inputCls} placeholder="e.g. Approved dog food" value={recipeForm.ingredient}
                  onChange={(e) => setRecipeForm((f) => ({ ...f, ingredient: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Amount *</label>
                <input type="text" className={inputCls} placeholder="e.g. 2" value={recipeForm.amount}
                  onChange={(e) => setRecipeForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Unit</label>
                <select className={inputCls} value={recipeForm.unit}
                  onChange={(e) => setRecipeForm((f) => ({ ...f, unit: e.target.value }))}>
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addRecipeItem} className="px-4 h-8 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90">Add</button>
              <button onClick={() => setAddingRecipe(false)} className="px-4 h-8 border border-border rounded-md text-xs text-muted-foreground hover:bg-muted">Cancel</button>
            </div>
          </div>
        )}

        {recipeItems.length === 0 && !addingRecipe ? (
          <p className="text-sm text-muted-foreground italic">No recipe items yet. Add ingredients to build the custom mix.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Ingredient</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Unit</th>
                  {canEdit && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {recipeItems.map((item, idx) => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="px-4 py-2.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.ingredient}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.amount}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.unit}</td>
                    {canEdit && (
                      <td className="px-2 py-2.5">
                        <button onClick={() => deleteRecipeItem(item.id)} className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recipeItems.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Full Recipe</p>
            <p className="text-sm text-foreground">
              {recipeItems.map((item, i) => (
                <span key={item.id}>
                  {i > 0 && ", "}
                  <span className="font-medium">{item.amount} {item.unit}</span> {item.ingredient}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
