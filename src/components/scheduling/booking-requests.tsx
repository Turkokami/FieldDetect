"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Request = {
  id: string;
  scheduledDate: string;
  serviceType: string;
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  property: { name: string; addressLine1: string; city: string; state: string };
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "Bed Bug Inspection",
  BED_BUG_TREATMENT: "Bed Bug Treatment",
  RODENT_INSPECTION: "Rodent Inspection",
  RODENT_EXCLUSION: "Rodent Exclusion",
  WILDLIFE_INSPECTION: "Wildlife Inspection",
  WILDLIFE_REMOVAL: "Wildlife Removal",
  BIRD_EXCLUSION: "Bird Exclusion",
  GOOSE_CONTROL: "Goose Control",
  GENERAL_PEST_INSPECTION: "General Pest Inspection",
  GENERAL_PEST_TREATMENT: "General Pest Treatment",
  OTHER: "Other",
};

export default function BookingRequests({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const accept = async (id: string) => {
    setActing(id);
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED" }),
      });
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  const decline = async (id: string) => {
    if (!confirm("Decline and cancel this booking request?")) return;
    setActing(id);
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
            {requests.length}
          </div>
          <span className="text-sm font-semibold text-amber-800">
            Booking Request{requests.length !== 1 ? "s" : ""} Pending
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-700 text-xs font-medium"
        >
          Dismiss
        </button>
      </div>

      <div className="divide-y divide-amber-100">
        {requests.map((r) => {
          const preferredDate = new Date(r.scheduledDate);
          const isPast = preferredDate < new Date();
          return (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.customer.firstName} {r.customer.lastName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-0.5">
                    📍 {r.property.addressLine1}, {r.property.city}, {r.property.state}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.customer.email}{r.customer.phone ? ` · ${r.customer.phone}` : ""}
                  </div>
                  {!isPast && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      🗓 Preferred: {preferredDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {preferredDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/scheduling/${r.id}`}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => decline(r.id)}
                    disabled={acting === r.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => accept(r.id)}
                    disabled={acting === r.id}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg text-white disabled:opacity-50 transition-all hover:-translate-y-px"
                    style={{ background: "#0ABAB5" }}
                  >
                    {acting === r.id ? "…" : "Accept ✓"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
