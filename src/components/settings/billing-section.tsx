"use client";

import { useState } from "react";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  TRIAL: "Free Trial",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "bg-amber-100 text-amber-700",
  STARTER: "bg-blue-100 text-blue-700",
  PROFESSIONAL: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-green-100 text-green-700",
};

export default function BillingSection({
  plan,
  stripeSubStatus,
  hasStripeCustomer,
}: {
  plan: string;
  stripeSubStatus: string | null;
  hasStripeCustomer: boolean;
}) {
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();
      if (data.data?.url) window.location.href = data.data.url;
    } finally {
      setPortalLoading(false);
    }
  };

  const isActive = stripeSubStatus === "active" || stripeSubStatus === "trialing";
  const isTrial = plan === "TRIAL";

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-700"}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
            {stripeSubStatus && !isTrial && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {stripeSubStatus}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isTrial
              ? "You're on the free trial. Upgrade to unlock all features."
              : `Your ${PLAN_LABELS[plan] ?? plan} plan is ${stripeSubStatus ?? "active"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTrial && (
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
            >
              Upgrade Plan
            </Link>
          )}
          {hasStripeCustomer && !isTrial && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {portalLoading ? "Loading…" : "Manage Billing"}
            </button>
          )}
        </div>
      </div>

      {isTrial && (
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
          {[
            { name: "Starter", price: "$79/mo", id: "starter" },
            { name: "Professional", price: "$149/mo", id: "professional", badge: "Popular" },
            { name: "Enterprise", price: "$299/mo", id: "enterprise" },
          ].map((p) => (
            <div key={p.id} className="text-center p-3 rounded-xl border border-border hover:border-[#0ABAB5] transition-colors">
              <div className="text-xs font-bold text-foreground mb-0.5">{p.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{p.price}</div>
              <Link
                href="/pricing"
                className="text-xs font-semibold"
                style={{ color: "#0ABAB5" }}
              >
                {p.id === "enterprise" ? "Contact" : "Select"} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
