"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  inspectionId: string;
  hasEmail: boolean;
  hasPhone: boolean;
  alreadyRequested: boolean;
};

export function ReviewRequestButton({ inspectionId, hasEmail, hasPhone, alreadyRequested }: Props) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(alreadyRequested);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/review-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSent(true);
      setOpen(false);
      toast.success("Review request sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
      >
        {sent ? "⭐ Review Requested" : "⭐ Request Review"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground mb-1">Request a Review</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Send the customer a link to rate their inspection experience.
            </p>

            <div className="space-y-2 mb-5">
              {hasEmail && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={channel === "email"}
                    onChange={() => setChannel("email")}
                    className="accent-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Email</div>
                    <div className="text-xs text-muted-foreground">Send review link via email</div>
                  </div>
                </label>
              )}
              {hasPhone && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="radio"
                    name="channel"
                    value="sms"
                    checked={channel === "sms"}
                    onChange={() => setChannel("sms")}
                    className="accent-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">SMS / Text</div>
                    <div className="text-xs text-muted-foreground">Send review link via text message</div>
                  </div>
                </label>
              )}
              {hasEmail && hasPhone && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <input
                    type="radio"
                    name="channel"
                    value="both"
                    checked={channel === "both"}
                    onChange={() => setChannel("both")}
                    className="accent-primary"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">Both</div>
                    <div className="text-xs text-muted-foreground">Send via email and text</div>
                  </div>
                </label>
              )}
              {!hasEmail && !hasPhone && (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                  No email or phone on file for this customer.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sending || (!hasEmail && !hasPhone)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "#0ABAB5" }}
              >
                {sending ? "Sending..." : "Send Review Request"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
