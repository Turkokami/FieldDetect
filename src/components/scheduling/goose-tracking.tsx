"use client";

import { useState } from "react";
import { Save } from "lucide-react";

type Props = {
  appointmentId: string;
  initial: {
    nestCount: number | null;
    totalEggCount: number | null;
    hatchedEggCount: number | null;
    unhatchedEggCount: number | null;
  };
};

export function GooseTracking({ appointmentId, initial }: Props) {
  const [nestCount, setNestCount] = useState(String(initial.nestCount ?? ""));
  const [totalEggCount, setTotalEggCount] = useState(String(initial.totalEggCount ?? ""));
  const [hatchedEggCount, setHatchedEggCount] = useState(String(initial.hatchedEggCount ?? ""));
  const [unhatchedEggCount, setUnhatchedEggCount] = useState(String(initial.unhatchedEggCount ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toInt = (v: string) => v === "" ? null : parseInt(v) || 0;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/appointments/${appointmentId}/goose`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nestCount: toInt(nestCount),
          totalEggCount: toInt(totalEggCount),
          hatchedEggCount: toInt(hatchedEggCount),
          unhatchedEggCount: toInt(unhatchedEggCount),
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-semibold tabular-nums";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
        🪺 Goose Field Tracking
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Record nest removal and egg counts for this service visit.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wide">Nests Removed</label>
          <input type="number" value={nestCount} onChange={(e) => { setNestCount(e.target.value); setSaved(false); }}
            min="0" placeholder="0" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wide">Total Eggs Found</label>
          <input type="number" value={totalEggCount} onChange={(e) => { setTotalEggCount(e.target.value); setSaved(false); }}
            min="0" placeholder="0" className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wide">Hatched Eggs</label>
          <input type="number" value={hatchedEggCount} onChange={(e) => { setHatchedEggCount(e.target.value); setSaved(false); }}
            min="0" placeholder="0" className={inp + " border-orange-200 focus:ring-orange-400/30"} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center uppercase tracking-wide">Unhatched Eggs</label>
          <input type="number" value={unhatchedEggCount} onChange={(e) => { setUnhatchedEggCount(e.target.value); setSaved(false); }}
            min="0" placeholder="0" className={inp + " border-green-200 focus:ring-green-400/30"} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          {nestCount && <span>🪺 <strong className="text-foreground">{nestCount}</strong> nest{parseInt(nestCount) !== 1 ? "s" : ""}</span>}
          {totalEggCount && <span>🥚 <strong className="text-foreground">{totalEggCount}</strong> eggs total</span>}
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
          <Save className="h-3 w-3" />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}
