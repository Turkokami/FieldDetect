import Link from "next/link";

export const metadata = { title: "Pricing — FieldDetect" };

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 79,
    description: "Perfect for solo operators and small teams.",
    features: [
      "Up to 2 technicians",
      "Unlimited appointments",
      "K9 inspection reports",
      "Customer portal",
      "Email notifications",
      "Invoice & payment collection",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    description: "Built for growing K9 inspection companies.",
    features: [
      "Up to 10 technicians",
      "Everything in Starter",
      "Route optimization",
      "SMS notifications",
      "Advanced analytics",
      "Priority support",
      "Custom branding on reports",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    description: "For large organizations with multiple locations.",
    features: [
      "Unlimited technicians",
      "Everything in Professional",
      "Multi-location support",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F4FFFE" }}>
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white">🐾</span>
          </div>
          <span className="font-bold text-foreground">FieldDetect</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground">
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center px-6 pt-16 pb-12 max-w-3xl mx-auto">
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6"
          style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5" }}
        >
          14-day free trial · No credit card required
        </div>
        <h1 className="text-4xl font-extrabold text-foreground mb-4 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground">
          Everything your K9 inspection business needs to run professionally.
          Cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-7 relative flex flex-col ${
                plan.highlight
                  ? "border-2 shadow-lg"
                  : "border border-border bg-card"
              }`}
              style={
                plan.highlight
                  ? {
                      background: "#0A0F1A",
                      borderColor: "#0ABAB5",
                      boxShadow: "0 0 40px rgba(10,186,181,0.15)",
                    }
                  : {}
              }
            >
              {plan.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: "#0ABAB5" }}
                >
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ color: plan.highlight ? "#fff" : "var(--color-foreground)" }}
                >
                  {plan.name}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: plan.highlight ? "#94a3b8" : "var(--color-muted-foreground)" }}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span
                  className="text-4xl font-extrabold"
                  style={{ color: plan.highlight ? "#fff" : "var(--color-foreground)" }}
                >
                  ${plan.price}
                </span>
                <span
                  className="text-sm ml-1"
                  style={{ color: plan.highlight ? "#64748b" : "var(--color-muted-foreground)" }}
                >
                  /month
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span style={{ color: "#0ABAB5" }}>✓</span>
                    <span style={{ color: plan.highlight ? "#cbd5e1" : "var(--color-foreground)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.id === "enterprise" ? "mailto:hello@fielddetect.com" : `/sign-up`}
                className={`block text-center py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-px ${
                  plan.highlight ? "text-white" : "text-white"
                }`}
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                        boxShadow: "0 2px 12px rgba(10,186,181,0.4)",
                      }
                    : { background: "#1e293b" }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ / Trust section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: "🔒", title: "Secure & compliant", desc: "All data encrypted at rest and in transit." },
            { icon: "🔄", title: "Cancel anytime", desc: "No long-term contracts. Cancel with one click." },
            { icon: "💬", title: "Real support", desc: "Talk to a real human, not a bot." },
          ].map((item) => (
            <div key={item.title} className="p-6 bg-card rounded-2xl border border-border">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h4 className="font-bold text-foreground mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
