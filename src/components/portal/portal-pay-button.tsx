"use client";

import { useState } from "react";

export default function PortalPayButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error ?? "Unable to start payment. Please contact us.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={pay}
        disabled={loading}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
      >
        {loading ? "Redirecting to payment…" : "Pay with Card"}
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
