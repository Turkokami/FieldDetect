"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  title: string | null;
  serviceType: string;
  status: string;
  scheduledDate: string;
  scheduledEndTime: string | null;
  estimatedMinutes: number | null;
  technicianId: string | null;
  k9TeamId: string | null;
  description: string | null;
  accessNotes: string | null;
  specialInstructions: string | null;
  customer: { id: string; firstName: string; lastName: string; companyName: string | null };
  property: { id: string; name: string };
};

type Technician = { id: string; firstName: string; lastName: string };
type K9Team = { id: string; name: string };

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

export default function EditAppointmentForm({
  appointment,
  technicians,
  k9Teams,
}: {
  appointment: Appointment;
  technicians: Technician[];
  k9Teams: K9Team[];
}) {
  const router = useRouter();
  const scheduled = new Date(appointment.scheduledDate);
  const [serviceType, setServiceType] = useState(appointment.serviceType);
  const [scheduledDate, setScheduledDate] = useState(scheduled.toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState(
    `${String(scheduled.getHours()).padStart(2, "0")}:${String(scheduled.getMinutes()).padStart(2, "0")}`
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(appointment.estimatedMinutes ?? 120));
  const [technicianId, setTechnicianId] = useState(appointment.technicianId ?? "");
  const [k9TeamId, setK9TeamId] = useState(appointment.k9TeamId ?? "");
  const [title, setTitle] = useState(appointment.title ?? "");
  const [description, setDescription] = useState(appointment.description ?? "");
  const [accessNotes, setAccessNotes] = useState(appointment.accessNotes ?? "");
  const [specialInstructions, setSpecialInstructions] = useState(appointment.specialInstructions ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const customerName = appointment.customer.companyName ??
    `${appointment.customer.firstName} ${appointment.customer.lastName}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      const endTime = new Date(dateTime.getTime() + parseInt(estimatedMinutes) * 60000);
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          scheduledDate: dateTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          estimatedMinutes: parseInt(estimatedMinutes),
          technicianId: technicianId || null,
          k9TeamId: k9TeamId || null,
          title: title || undefined,
          description: description || undefined,
          accessNotes: accessNotes || undefined,
          specialInstructions: specialInstructions || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      router.push(`/scheduling/${appointment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const inputClass = "w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/scheduling/${appointment.id}`} className="text-muted-foreground hover:text-foreground text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Appointment</h1>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 mb-5 text-sm">
        <span className="text-muted-foreground">Customer: </span>
        <span className="font-semibold text-foreground">{customerName}</span>
        <span className="text-muted-foreground mx-2">·</span>
        <span className="text-muted-foreground">Property: </span>
        <span className="font-semibold text-foreground">{appointment.property.name}</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Service Type</label>
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
            {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Estimated Duration</label>
          <select value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} className={inputClass}>
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

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Assign Technician</label>
          <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
        </div>

        {k9Teams.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Assign K9 Team</label>
            <select value={k9TeamId} onChange={(e) => setK9TeamId(e.target.value)} className={inputClass}>
              <option value="">No K9 Team</option>
              {k9Teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Full building inspection" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Access Notes</label>
          <textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Special Instructions</label>
          <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Internal Notes</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Link
            href={`/scheduling/${appointment.id}`}
            className="flex-1 h-10 border border-border rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
