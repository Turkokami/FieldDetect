"use client";

import { useState } from "react";

export default function BookingLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://field-detect.vercel.app";
  const url = `${appUrl}/book/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">Customer Booking Page</h3>
        <p className="text-xs text-muted-foreground">
          Share this link so customers can submit service requests directly.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground font-mono truncate">
          {url}
        </div>
        <button
          onClick={copy}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <a
          href={`/book/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{ background: "#0ABAB5" }}
        >
          Preview
        </a>
      </div>
    </div>
  );
}
