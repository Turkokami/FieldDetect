"use client";

import { useState } from "react";
import { toast } from "sonner";

const MODULES = [
  {
    key: "GOOSE_CONTROL",
    label: "Goose Control",
    icon: "🪿",
    description: "Canada goose nesting management, egg depredation, and habitat modification. Enables goose tracking on jobs.",
  },
  {
    key: "BIRD_EXCLUSION",
    label: "Bird Exclusion",
    icon: "🐦",
    description: "Pest bird exclusion services — pigeons, sparrows, starlings. Enables bird exclusion estimate module.",
  },
  {
    key: "RODENT_INSPECTION",
    label: "Rodent Inspection",
    icon: "🐭",
    description: "K9 rodent detection inspections. Enables rodent dog detection estimate module.",
  },
  {
    key: "RODENT_EXCLUSION",
    label: "Rodent Exclusion",
    icon: "🚧",
    description: "Rodent exclusion and prevention services. Enables rodent exclusion estimate module.",
  },
  {
    key: "WILDLIFE",
    label: "Wildlife Services",
    icon: "🦝",
    description: "General wildlife inspection and removal services.",
  },
];

export function ModulesSection({ initialModules }: { initialModules: string[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialModules));
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: string) => {
    const next = new Set(enabled);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    setSaving(key);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledModules: Array.from(next) }),
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
      toast.success(next.has(key) ? `${key.replace(/_/g, " ")} enabled` : `${key.replace(/_/g, " ")} disabled`);
    } catch {
      toast.error("Failed to update modules");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bed bug is always on — show as locked */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">🐛</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Bed Bug Detection</h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Core</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            K9 bed bug detection inspections, reports, and treatment estimates. Always enabled.
          </p>
        </div>
        <div className="w-10 h-6 rounded-full bg-primary shrink-0 flex items-center justify-end px-0.5">
          <div className="w-5 h-5 rounded-full bg-white shadow" />
        </div>
      </div>

      {MODULES.map((m) => {
        const isOn = enabled.has(m.key);
        const isSaving = saving === m.key;
        return (
          <div key={m.key} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isOn ? "bg-primary/10" : "bg-muted"}`}>
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">{m.label}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </div>
            <button
              onClick={() => toggle(m.key)}
              disabled={isSaving}
              className={`w-10 h-6 rounded-full shrink-0 flex items-center transition-colors duration-200 disabled:opacity-50 ${
                isOn ? "bg-primary justify-end px-0.5" : "bg-muted justify-start px-0.5"
              }`}
              aria-label={isOn ? `Disable ${m.label}` : `Enable ${m.label}`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
