"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { DEFAULT_CONTRACT_TEMPLATE, CONTRACT_VARIABLES } from "@/lib/contract-template";

export function ContractTemplateSection({
  initialTemplate,
  canEdit,
}: {
  initialTemplate: string | null;
  canEdit: boolean;
}) {
  const [template, setTemplate] = useState(initialTemplate ?? DEFAULT_CONTRACT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const handleChange = (val: string) => {
    setTemplate(val);
    setDirty(true);
  };

  const handleReset = () => {
    setTemplate(DEFAULT_CONTRACT_TEMPLATE);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractTemplate: template }),
      });
      if (!res.ok) throw new Error();
      toast.success("Contract template saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Variable reference chips */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Available variables</p>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_VARIABLES.map((v) => (
            <span
              key={v.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/8 border border-primary/20 text-xs font-mono text-primary"
              title={v.description}
            >
              {v.key}
              <span className="text-[10px] font-sans text-muted-foreground ml-1 not-italic">
                — {v.description}
              </span>
            </span>
          ))}
        </div>
      </div>

      <textarea
        value={template}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={!canEdit}
        rows={24}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y disabled:opacity-60"
        placeholder="Enter your contract template…"
      />

      {canEdit && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 h-9 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      )}
    </div>
  );
}
