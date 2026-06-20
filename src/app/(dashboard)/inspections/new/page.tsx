"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

type Appointment = {
  id: string;
  scheduledDate: string;
  status: string;
  property: { name: string; addressLine1: string; city: string; state: string };
  customer: { firstName: string; lastName: string; companyName: string | null };
  technician: { firstName: string; lastName: string } | null;
};

function NewInspectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("appointmentId") ?? "";

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState(preselect);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/appointments?status=CONFIRMED,SCHEDULED,ARRIVED,ON_SITE&pageSize=50")
      .then((r) => r.json())
      .then((d) => setAppointments(d.data ?? []));
  }, []);

  const handleStart = async () => {
    if (!selected) { setError("Please select an appointment"); return; }
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start inspection");
      router.push(`/field/${selected}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStarting(false);
    }
  };

  const selectedAppt = appointments.find((a) => a.id === selected);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inspections" className="text-sm text-muted-foreground hover:text-foreground">
          ← Inspections
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold text-foreground">Start Inspection</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Select Appointment
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose a confirmed or scheduled appointment to begin recording inspection results.
        </p>

        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">📅</div>
            <p className="text-sm text-muted-foreground">No confirmed appointments found.</p>
            <Link
              href="/scheduling/new"
              className="inline-block mt-3 text-sm text-primary hover:underline"
            >
              Schedule an appointment →
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {appointments.map((appt) => (
              <button
                key={appt.id}
                onClick={() => setSelected(appt.id)}
                className="w-full text-left rounded-xl border-2 p-4 transition-all"
                style={selected === appt.id ? {
                  borderColor: "#0ABAB5",
                  background: "rgba(10,186,181,0.06)",
                } : {
                  borderColor: "var(--color-border)",
                  background: "var(--color-card)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {appt.property.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {appt.property.addressLine1}, {appt.property.city}, {appt.property.state}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {appt.customer.companyName ?? `${appt.customer.firstName} ${appt.customer.lastName}`}
                      {appt.technician && ` · ${appt.technician.firstName} ${appt.technician.lastName}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-foreground">
                      {formatDateTime(new Date(appt.scheduledDate))}
                    </div>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-medium">
                      {appt.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {selected === appt.id && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-medium" style={{ color: "#0ABAB5" }}>Selected</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAppt && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ready to Inspect</div>
          <div className="text-sm font-medium text-foreground">{selectedAppt.property.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {selectedAppt.property.addressLine1}, {selectedAppt.property.city}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This will open the mobile field view for recording unit-by-unit results.
          </p>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
      )}

      <div className="flex gap-3">
        <Link
          href="/inspections"
          className="flex-1 h-10 flex items-center justify-center border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleStart}
          disabled={!selected || starting}
          className="flex-1 h-10 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-px disabled:opacity-50 disabled:translate-y-0"
          style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", boxShadow: "0 2px 8px rgba(10,186,181,0.3)" }}
        >
          {starting ? "Starting..." : "Start Inspection →"}
        </button>
      </div>
    </div>
  );
}

export default function NewInspectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <NewInspectionForm />
    </Suspense>
  );
}
