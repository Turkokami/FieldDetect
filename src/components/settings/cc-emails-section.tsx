"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  initialEmails: string[];
  canEdit: boolean;
};

export default function CcEmailsSection({ initialEmails, canEdit }: Props) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (next: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ccEmails: next }),
      });
      if (!res.ok) throw new Error();
      setEmails(next);
      toast.success("CC emails saved");
    } catch {
      toast.error("Failed to save CC emails");
    } finally {
      setSaving(false);
    }
  };

  const add = () => {
    const val = draft.trim().toLowerCase();
    if (!val) return;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!isValid) { toast.error("Invalid email address"); return; }
    if (emails.includes(val)) { toast.error("Already in list"); return; }
    const next = [...emails, val];
    setDraft("");
    save(next);
  };

  const remove = (email: string) => {
    save(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">CC Emails</h3>
        <p className="text-xs text-muted-foreground mt-1">
          These addresses will be CC&apos;d on all outgoing emails — invoices, reports, referrals, and other paperwork.
        </p>
      </div>

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <div
              key={email}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm text-foreground"
            >
              <span>{email}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(email)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 leading-none"
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {emails.length === 0 && (
        <p className="text-sm text-muted-foreground">No CC emails configured.</p>
      )}

      {canEdit && (
        <div className="flex gap-2">
          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="name@example.com"
            disabled={saving}
            className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={add}
            disabled={saving || !draft.trim()}
            className="px-4 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
