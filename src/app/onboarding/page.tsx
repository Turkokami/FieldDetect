"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("Company name is required");
      return;
    }
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <span className="text-2xl font-bold text-white">FD</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to FieldDetect</h1>
          <p className="text-muted-foreground mt-2">
            Hi {user?.firstName ?? "there"}! Let&apos;s set up your organization.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {/* Steps indicator */}
          <div className="flex items-center mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= s
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      step > s ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Company Information
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    Tell us about your pest control business.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Company Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    name="companyName"
                    value={form.companyName}
                    onChange={handleChange}
                    placeholder="Acme Pest Control LLC"
                    required
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Business Phone
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(555) 000-0000"
                    type="tel"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.companyName.trim()) {
                      setError("Company name is required");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                  className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">
                    Business Address
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5">
                    This will appear on your inspection reports and invoices.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Street Address
                  </label>
                  <input
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Chicago"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
                    <input
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="IL"
                      maxLength={2}
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">ZIP Code</label>
                  <input
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    placeholder="60601"
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Setting up..." : "Launch FieldDetect"}
                  </button>
                </div>
              </>
            )}

            {step === 1 && error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          You can update these details anytime in Settings.
        </p>
      </div>
    </div>
  );
}
