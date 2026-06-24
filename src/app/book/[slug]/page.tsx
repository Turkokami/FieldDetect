"use client";

import { useState, useEffect } from "react";

const SERVICE_TYPES = [
  { value: "BED_BUG_INSPECTION", label: "Bed Bug Inspection" },
  { value: "BED_BUG_TREATMENT", label: "Bed Bug Treatment" },
  { value: "RODENT_INSPECTION", label: "Rodent Inspection" },
  { value: "RODENT_EXCLUSION", label: "Rodent Exclusion" },
  { value: "WILDLIFE_INSPECTION", label: "Wildlife Inspection" },
  { value: "WILDLIFE_REMOVAL", label: "Wildlife Removal" },
  { value: "BIRD_EXCLUSION", label: "Bird Exclusion" },
  { value: "GOOSE_CONTROL", label: "Goose Control" },
  { value: "GENERAL_PEST_INSPECTION", label: "General Pest Inspection" },
  { value: "GENERAL_PEST_TREATMENT", label: "General Pest Treatment" },
  { value: "OTHER", label: "Other" },
];

type OrgInfo = { name: string; phone: string | null; logoUrl: string | null };

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [orgError, setOrgError] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    serviceType: "BED_BUG_INSPECTION",
    preferredDate: "",
    preferredTime: "09:00",
    notes: "",
  });

  useEffect(() => {
    params.then(({ slug: s }) => {
      setSlug(s);
      fetch(`/api/public/org/${s}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setOrgError(true);
          else setOrg(d.data);
        })
        .catch(() => setOrgError(true));
    });
  }, [params]);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const next = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, orgSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const ic = "w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] transition-all placeholder:text-gray-400";
  const minDate = new Date().toISOString().split("T")[0];

  if (orgError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 text-sm">This booking link is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F4FFFE" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0A0F1A 0%, #0D1A1F 100%)" }} className="px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}>
            <span className="text-white text-sm">🐾</span>
          </div>
          <span className="font-bold text-white">{org?.name ?? "FieldDetect"}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10">
        {submitted ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl" style={{ background: "rgba(10,186,181,0.1)" }}>
              ✅
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
            <p className="text-gray-500 text-sm">
              Thanks! <strong>{org?.name}</strong> will review your request and reach out to confirm your appointment time.
            </p>
            <p className="text-gray-400 text-xs mt-4">Check your email for a confirmation from us.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Request an Inspection</h1>
              <p className="text-gray-500 text-sm mt-1">
                {org ? `Schedule service with ${org.name}` : "Schedule your K9 inspection service"}
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6 max-w-xs mx-auto">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={step >= s
                      ? { background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", color: "#fff" }
                      : { background: "#e5e7eb", color: "#9ca3af" }}
                  >
                    {step > s ? "✓" : s}
                  </div>
                  <span className="text-xs font-medium" style={{ color: step >= s ? "#0ABAB5" : "#9ca3af" }}>
                    {s === 1 ? "Your Info" : "Service"}
                  </span>
                  {s < 2 && <div className="flex-1 h-px" style={{ background: step > s ? "#0ABAB5" : "#e5e7eb" }} />}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              {step === 1 && (
                <form onSubmit={next} className="space-y-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Your Information</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">First Name *</label>
                      <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required className={ic} placeholder="Jane" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Last Name *</label>
                      <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required className={ic} placeholder="Smith" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Email *</label>
                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={ic} placeholder="jane@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Phone</label>
                    <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={ic} placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Company / Building Name</label>
                    <input type="text" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={ic} placeholder="Optional" />
                  </div>

                  <div className="pt-2">
                    <h2 className="font-semibold text-gray-900 mb-3">Property Address</h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Street Address *</label>
                        <input type="text" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} required className={ic} placeholder="123 Main St" />
                      </div>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">City *</label>
                          <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} required className={ic} placeholder="Chicago" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">State *</label>
                          <input type="text" value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} maxLength={2} required className={ic} placeholder="IL" />
                        </div>
                      </div>
                      <div className="w-2/5">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">ZIP *</label>
                        <input type="text" value={form.zip} onChange={(e) => set("zip", e.target.value)} required className={ic} placeholder="60601" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl text-sm font-bold text-white mt-4 transition-all hover:-translate-y-px"
                    style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", boxShadow: "0 2px 12px rgba(10,186,181,0.3)" }}
                  >
                    Continue →
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-semibold text-gray-900 mb-1">Service Details</h2>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Service Type *</label>
                    <select value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)} className={ic}>
                      {SERVICE_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Preferred Date</label>
                      <input
                        type="date"
                        value={form.preferredDate}
                        onChange={(e) => set("preferredDate", e.target.value)}
                        min={minDate}
                        className={ic}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Preferred Time</label>
                      <input type="time" value={form.preferredTime} onChange={(e) => set("preferredTime", e.target.value)} className={ic} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Notes / Special Instructions</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] transition-all placeholder:text-gray-400 resize-none"
                      placeholder="Access instructions, gate code, special requirements..."
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-11 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", boxShadow: "0 2px 12px rgba(10,186,181,0.3)" }}
                    >
                      {submitting ? "Submitting…" : "Submit Request →"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">
              Powered by FieldDetect · K9 Inspection Management
            </p>
          </>
        )}
      </div>
    </div>
  );
}
