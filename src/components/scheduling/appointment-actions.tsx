"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Appointment = {
  id: string;
  status: string;
  customerId: string;
  propertyId: string;
  inspection?: { id: string } | null;
  userRole?: string;
};

type Props = {
  appointment: Appointment;
  variant?: "menu" | "start-inspection";
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  REQUESTED: [
    { label: "Confirm Appointment", next: "CONFIRMED" },
    { label: "Mark Scheduled", next: "SCHEDULED" },
    { label: "Cancel", next: "CANCELLED" },
  ],
  SCHEDULED: [
    { label: "Confirm Appointment", next: "CONFIRMED" },
    { label: "Cancel", next: "CANCELLED" },
  ],
  CONFIRMED: [
    { label: "Mark En Route", next: "EN_ROUTE" },
    { label: "Cancel", next: "CANCELLED" },
  ],
  EN_ROUTE: [
    { label: "Mark On Site", next: "ON_SITE" },
  ],
  ON_SITE: [
    { label: "Start Inspection", next: "INSPECTION_STARTED" },
  ],
  INSPECTION_STARTED: [
    { label: "Complete Inspection", next: "INSPECTION_COMPLETE" },
  ],
  INSPECTION_COMPLETE: [
    { label: "Mark Report Sent", next: "REPORT_SENT" },
  ],
  REPORT_SENT: [
    { label: "Mark Invoiced", next: "INVOICED" },
  ],
  INVOICED: [
    { label: "Mark Paid", next: "PAID" },
  ],
};

export default function AppointmentActions({ appointment, variant = "menu" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const transitions = STATUS_TRANSITIONS[appointment.status] ?? [];
  const isComplete = ["INSPECTION_COMPLETE", "REPORT_SENT", "INVOICED", "PAID"].includes(appointment.status);
  const isDeletable = ["CANCELLED", "NO_SHOW", "DRAFT"].includes(appointment.status);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setOpen(false);
    try {
      if (newStatus === "INSPECTION_STARTED" && !appointment.inspection) {
        const res = await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: appointment.id }),
        });
        if (!res.ok) throw new Error("Failed to start inspection");
        const data = await res.json();
        router.push(`/inspections/${data.data.id}`);
        return;
      }

      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setOpen(false);
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/scheduling");
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (variant === "start-inspection") {
    return (
      <button
        onClick={() => handleStatusChange("INSPECTION_STARTED")}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Inspection"}
      </button>
    );
  }

  const hasActions = transitions.length > 0 || isComplete || isDeletable;
  if (!hasActions) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {loading ? "..." : "Actions"}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 overflow-hidden">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={() => handleStatusChange(t.next)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    t.next === "CANCELLED" ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              {transitions.length > 0 && (isComplete || isDeletable) && (
                <div className="border-t border-border my-1" />
              )}
              {isComplete && (
                <Link
                  href={`/invoices/new?customerId=${appointment.customerId}&propertyId=${appointment.propertyId}&appointmentId=${appointment.id}`}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors text-foreground block"
                  onClick={() => setOpen(false)}
                >
                  Create Invoice
                </Link>
              )}
              <Link
                href={`/scheduling/${appointment.id}/edit`}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors text-foreground block"
                onClick={() => setOpen(false)}
              >
                Edit Appointment
              </Link>
              {isDeletable && (
                <button
                  onClick={() => { setOpen(false); setConfirmDelete(true); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors text-destructive"
                >
                  Delete Appointment
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-2">Delete Appointment?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete this appointment and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
