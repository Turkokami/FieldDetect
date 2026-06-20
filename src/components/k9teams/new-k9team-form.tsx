"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dog, User, ChevronLeft } from "lucide-react";

type Technician = { id: string; firstName: string; lastName: string };

export function NewK9TeamForm({ technicians }: { technicians: Technician[] }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [handlerUserId, setHandlerUserId] = useState("");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");
  const [dogCertificationNumber, setDogCertificationNumber] = useState("");
  const [dogCertifiedUntil, setDogCertifiedUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Team name is required"); return; }
    if (!dogName.trim()) { setError("Dog name is required"); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/k9teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || undefined,
          handlerUserId: handlerUserId || undefined,
          dogName: dogName.trim(),
          dogBreed: dogBreed.trim() || undefined,
          dogCertificationNumber: dogCertificationNumber.trim() || undefined,
          dogCertifiedUntil: dogCertifiedUntil
            ? new Date(dogCertifiedUntil).toISOString()
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create team");
      }

      const data = await res.json();
      router.push(`/k9teams/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/k9teams"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          K9 Teams
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New K9 Team</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Team info */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Team Details</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Team Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Team"
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Territory, specialization, or other notes…"
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* Handler */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Handler</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Primary Handler
            </label>
            {technicians.length > 0 ? (
              <select
                value={handlerUserId}
                onChange={(e) => setHandlerUserId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Select handler —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No users found. Add team members from Settings.
              </p>
            )}
          </div>
        </div>

        {/* Dog */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Dog className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">K9 Dog</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Dog Name <span className="text-destructive">*</span>
              </label>
              <input
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                placeholder="e.g. Rex"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">Breed</label>
              <input
                value={dogBreed}
                onChange={(e) => setDogBreed(e.target.value)}
                placeholder="e.g. Beagle"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Certification #
              </label>
              <input
                value={dogCertificationNumber}
                onChange={(e) => setDogCertificationNumber(e.target.value)}
                placeholder="e.g. NWCB-2024-001"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Certified Until
              </label>
              <input
                type="date"
                value={dogCertifiedUntil}
                onChange={(e) => setDogCertifiedUntil(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/k9teams"
            className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "#0ABAB5" }}
          >
            {saving ? "Creating…" : "Create K9 Team"}
          </button>
        </div>
      </form>
    </div>
  );
}
