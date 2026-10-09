"use client";

import { useState } from "react";
import { toast } from "sonner";

export function EstimateAlertsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateOpenAlerts: next }),
      });
      if (!res.ok) throw new Error();
      setEnabled(next);
      toast.success(next ? "Open alerts on" : "Open alerts off");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-foreground">Alert me when a customer opens an estimate</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Owners and admins get an email (and a text, if enabled) the first time each customer opens an estimate link. Accept and decline alerts are always sent.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
