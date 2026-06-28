"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  inspectionId: string;
  defaultEmail?: string;
};

export function SendReferralButton({ inspectionId, defaultEmail = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/reports/${inspectionId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send");
      }
      toast.success(`Referral sent to ${email.trim()}`);
      setOpen(false);
      setEmail(defaultEmail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send referral");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
        title="Email this referral to a pest control company"
      >
        Email Referral
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Email Pest Control Referral</h2>
              <p className="text-sm text-muted-foreground mt-1">
                The referral PDF will be attached and sent directly to the pest control company. Your CC addresses will be included automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Pest Control Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="pestcontrol@example.com"
                disabled={sending}
                autoFocus
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={sending}
                className="px-4 h-9 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending || !email.trim()}
                className="px-5 h-9 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send Referral"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
