"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Customer = { id: string; firstName: string; lastName: string; companyName: string | null };
type Property = { id: string; name: string; addressLine1: string; city: string };
type Technician = { id: string; firstName: string; lastName: string };

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

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get("customerId") ?? "";
  const prefillPropertyId = searchParams.get("propertyId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [customerId, setCustomerId] = useState(prefillCustomerId);
  const [propertyId, setPropertyId] = useState(prefillPropertyId);
  const [technicianId, setTechnicianId] = useState("");
  const [serviceType, setServiceType] = useState("BED_BUG_INSPECTION");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [estimatedMinutes, setEstimatedMinutes] = useState("120");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers?pageSize=100")
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []));
    fetch("/api/users?role=TECHNICIAN")
      .then((r) => r.json())
      .then((d) => setTechnicians(d.data ?? []));
  }, []);

  useEffect(() => {
    if (!customerId) { setProperties([]); return; }
    fetch(`/api/properties?customerId=${customerId}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setProperties(d.data ?? []));
  }, [customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !propertyId || !scheduledDate) {
      setError("Customer, property, and date are required.");
      return;
    }

    setSaving(true);
    setError("");

    const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const endTime = new Date(dateTime.getTime() + parseInt(estimatedMinutes) * 60000);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          propertyId,
          technicianId: technicianId || undefined,
          serviceType,
          scheduledDate: dateTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          estimatedMinutes: parseInt(estimatedMinutes),
          title: title || undefined,
          description: description || undefined,
          accessNotes: accessNotes || undefined,
          specialInstructions: specialInstructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create appointment");
      }

      const data = await res.json();
      router.push(`/scheduling/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">New Appointment</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Customer */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Customer <span className="text-destructive">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setPropertyId(""); }}
            required
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}{c.companyName ? ` — ${c.companyName}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Property */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Property <span className="text-destructive">*</span>
          </label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            disabled={!customerId}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          >
            <option value="">
              {!customerId ? "Select customer first" : "Select property..."}
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.addressLine1}, {p.city}
              </option>
            ))}
          </select>
        </div>

        {/* Service Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Service Type</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Estimated Duration
          </label>
          <select
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="240">4 hours</option>
            <option value="360">6 hours</option>
            <option value="480">8 hours</option>
          </select>
        </div>

        {/* Technician */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Assign Technician
          </label>
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Title <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Full building inspection — 24 units"
            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Access Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Access Notes</label>
          <textarea
            value={accessNotes}
            onChange={(e) => setAccessNotes(e.target.value)}
            placeholder="Gate code, parking, contact on site..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Special Instructions */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Special Instructions</label>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special requirements for the technician..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Internal Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internal notes about this appointment..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
