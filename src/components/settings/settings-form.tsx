"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Org = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  googleReviewUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logoUrl: string | null;
};

export default function SettingsForm({ org, canEdit }: { org: Org; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: org.name,
    phone: org.phone ?? "",
    email: org.email ?? "",
    website: org.website ?? "",
    googleReviewUrl: org.googleReviewUrl ?? "",
    addressLine1: org.addressLine1 ?? "",
    addressLine2: org.addressLine2 ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    zip: org.zip ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">Company Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={!canEdit}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="(555) 000-0000"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="info@company.com"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
          <input
            name="website"
            type="url"
            value={form.website}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="https://yourcompany.com"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Google Review Link</label>
          <input
            name="googleReviewUrl"
            type="url"
            value={form.googleReviewUrl}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="https://g.page/r/..."
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground mt-1">Customers will be directed here after reading their report</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">Street Address</label>
          <input
            name="addressLine1"
            value={form.addressLine1}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="123 Main St"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            disabled={!canEdit}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">State</label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              disabled={!canEdit}
              maxLength={2}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">ZIP</label>
            <input
              name="zip"
              value={form.zip}
              onChange={handleChange}
              disabled={!canEdit}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Saved successfully</span>
          )}
        </div>
      )}
    </form>
  );
}
