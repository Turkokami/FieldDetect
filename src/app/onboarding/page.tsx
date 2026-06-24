"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const STEPS = [
  { num: 1, label: "Company" },
  { num: 2, label: "Address" },
];

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(true);

  // Auto-accept pending invite if one exists for this email
  useEffect(() => {
    if (!isLoaded || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) { setCheckingInvite(false); return; }

    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send empty body — server checks for invite first
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.inviteAccepted) {
            const role = data.data?.user?.role;
            router.push(role === "TECHNICIAN" ? "/field" : "/dashboard");
            return;
          }
        }
        setCheckingInvite(false);
      })
      .catch(() => setCheckingInvite(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (!isLoaded || checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4FFFE" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#0ABAB5", borderTopColor: "transparent" }} />
      </div>
    );
  }
  const [form, setForm] = useState({
    companyName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Setup failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-muted-foreground";

  return (
    <div className="min-h-screen flex" style={{ background: "#F4FFFE" }}>
      {/* Left brand strip */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 shrink-0 p-10"
        style={{ background: "linear-gradient(180deg, #0A0F1A 0%, #0D1A1F 100%)" }}
      >
        <div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-8"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <span className="text-white text-xl">🐾</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">FieldDetect</h1>
          <p className="text-sm" style={{ color: "#0ABAB5" }}>K9 Inspection Command Center</p>

          <div className="mt-12 space-y-5">
            {[
              { icon: "✅", text: "Unit-by-unit K9 result recording" },
              { icon: "📋", text: "Auto-generated inspection reports" },
              { icon: "💳", text: "Invoicing & payment collection" },
              { icon: "📊", text: "Team analytics & route planning" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm" style={{ color: "#7ECECE" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: "#2D4A47" }}>
          You can update all of this later in Settings.
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
            >
              <span className="text-white">🐾</span>
            </div>
            <span className="font-bold text-foreground text-lg">FieldDetect</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome, {user?.firstName ?? "there"}!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Let&apos;s get your organization set up — takes about 60 seconds.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                  style={step >= s.num ? {
                    background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                    color: "#fff",
                  } : {
                    background: "var(--color-muted)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className="text-xs font-medium" style={{ color: step >= s.num ? "#0ABAB5" : "var(--color-muted-foreground)" }}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px transition-all"
                    style={{ background: step > s.num ? "#0ABAB5" : "var(--color-border)" }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-7 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-0.5">Company Information</h3>
                    <p className="text-sm text-muted-foreground">Tell us about your pest control business.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Company Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        name="companyName"
                        value={form.companyName}
                        onChange={handleChange}
                        placeholder="Acme K9 Inspections LLC"
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Business Phone</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="(555) 000-0000"
                        type="tel"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!form.companyName.trim()) { setError("Company name is required"); return; }
                      setError("");
                      setStep(2);
                    }}
                    className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-px"
                    style={{
                      background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                      boxShadow: "0 2px 10px rgba(10,186,181,0.35)",
                    }}
                  >
                    Continue →
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-0.5">Business Address</h3>
                    <p className="text-sm text-muted-foreground">Appears on reports and invoices.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Street Address</label>
                      <input name="addressLine1" value={form.addressLine1} onChange={handleChange} placeholder="123 Main Street" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                        <input name="city" value={form.city} onChange={handleChange} placeholder="Chicago" className={inputClass} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                        <input name="state" value={form.state} onChange={handleChange} placeholder="IL" maxLength={2} className={inputClass} />
                      </div>
                    </div>
                    <div className="w-2/5">
                      <label className="block text-sm font-medium text-foreground mb-1.5">ZIP</label>
                      <input name="zip" value={form.zip} onChange={handleChange} placeholder="60601" className={inputClass} />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-10 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-px disabled:opacity-50 disabled:translate-y-0"
                      style={{
                        background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)",
                        boxShadow: "0 2px 10px rgba(10,186,181,0.35)",
                      }}
                    >
                      {loading ? "Setting up..." : "Launch FieldDetect 🚀"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-5">
            All details can be updated anytime in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
