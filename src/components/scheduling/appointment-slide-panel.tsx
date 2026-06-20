"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, Phone, Mail, MapPin, User, Clock, Dog,
  ChevronRight, ExternalLink, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  REQUESTED:           { label: "Requested",           bg: "#1e293b", text: "#94a3b8" },
  SCHEDULED:           { label: "Scheduled",           bg: "#1e3a5f", text: "#60a5fa" },
  CONFIRMED:           { label: "Confirmed",           bg: "#14532d", text: "#4ade80" },
  EN_ROUTE:            { label: "En Route",            bg: "#451a03", text: "#fb923c" },
  ON_SITE:             { label: "On Site",             bg: "#431407", text: "#f97316" },
  INSPECTION_STARTED:  { label: "Inspecting",          bg: "#2e1065", text: "#a78bfa" },
  INSPECTION_COMPLETE: { label: "Complete",            bg: "#052e16", text: "#34d399" },
  REPORT_SENT:         { label: "Report Sent",         bg: "#042f2e", text: "#2dd4bf" },
  INVOICED:            { label: "Invoiced",            bg: "#0c1a2e", text: "#38bdf8" },
  PAID:                { label: "Paid",                bg: "#052e16", text: "#4ade80" },
  CANCELLED:           { label: "Cancelled",           bg: "#1c0a0a", text: "#f87171" },
  NO_SHOW:             { label: "No Show",             bg: "#1c0a0a", text: "#fca5a5" },
};

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  REQUESTED:           [{ label: "Confirm", next: "CONFIRMED" }, { label: "Cancel", next: "CANCELLED" }],
  SCHEDULED:           [{ label: "Confirm", next: "CONFIRMED" }, { label: "Cancel", next: "CANCELLED" }],
  CONFIRMED:           [{ label: "En Route", next: "EN_ROUTE" }, { label: "Cancel", next: "CANCELLED" }],
  EN_ROUTE:            [{ label: "On Site", next: "ON_SITE" }],
  ON_SITE:             [{ label: "Start Inspection", next: "INSPECTION_STARTED" }],
  INSPECTION_STARTED:  [{ label: "Complete", next: "INSPECTION_COMPLETE" }],
  INSPECTION_COMPLETE: [{ label: "Report Sent", next: "REPORT_SENT" }],
  REPORT_SENT:         [{ label: "Mark Invoiced", next: "INVOICED" }],
  INVOICED:            [{ label: "Mark Paid", next: "PAID" }],
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "K9 Bed Bug Inspection",
  BED_BUG_TREATMENT: "Bed Bug Treatment",
  RODENT_INSPECTION: "Rodent Inspection",
  RODENT_EXCLUSION: "Rodent Exclusion",
  WILDLIFE_INSPECTION: "Wildlife Inspection",
  WILDLIFE_REMOVAL: "Wildlife Removal",
  BIRD_EXCLUSION: "Bird Exclusion",
  GOOSE_CONTROL: "Goose Control",
  GENERAL_PEST_INSPECTION: "Pest Inspection",
  GENERAL_PEST_TREATMENT: "Pest Treatment",
  OTHER: "Other",
};

type AptDetail = {
  id: string;
  status: string;
  serviceType: string;
  title: string | null;
  scheduledDate: string;
  scheduledEndTime: string | null;
  estimatedMinutes: number | null;
  accessNotes: string | null;
  specialInstructions: string | null;
  notes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
  };
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string | null;
  };
  technician: { id: string; firstName: string; lastName: string } | null;
  k9Team: {
    id: string;
    name: string;
    dogs: { id: string; name: string; breed: string | null }[];
    members: { isPrimary: boolean; user: { firstName: string; lastName: string } }[];
  } | null;
  inspection: { id: string; totalPositive: number; totalNegative: number; totalInconclusive: number } | null;
};

export function AppointmentSlidePanel({
  appointmentId,
  onClose,
  onStatusChange,
}: {
  appointmentId: string;
  onClose: () => void;
  onStatusChange?: () => void;
}) {
  const router = useRouter();
  const [apt, setApt] = useState<AptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((d) => { setApt(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [appointmentId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!apt) return;
    setUpdatingStatus(true);
    try {
      await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const r = await fetch(`/api/appointments/${apt.id}`);
      const d = await r.json();
      setApt(d.data);
      onStatusChange?.();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusCfg = apt ? (STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.REQUESTED) : null;
  const transitions = apt ? (STATUS_TRANSITIONS[apt.status] ?? []) : [];
  const handler = apt?.k9Team?.members.find((m) => m.isPrimary);
  const dog = apt?.k9Team?.dogs[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-sm flex flex-col shadow-2xl"
        style={{ background: "#0D1117", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            Appointment
          </span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
          </div>
        )}

        {apt && (
          <div className="flex-1 overflow-y-auto">
            {/* Service + Status */}
            <div className="px-4 pt-4 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-white leading-tight">
                  {apt.title ?? SERVICE_LABELS[apt.serviceType] ?? apt.serviceType}
                </h2>
                {statusCfg && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                    style={{ background: statusCfg.bg, color: statusCfg.text }}
                  >
                    {statusCfg.label}
                  </span>
                )}
              </div>

              {/* Status action buttons */}
              {transitions.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {transitions.map((t) => (
                    <button
                      key={t.next}
                      onClick={() => handleStatusChange(t.next)}
                      disabled={updatingStatus}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        t.next === "CANCELLED"
                          ? "bg-red-900/50 text-red-400 hover:bg-red-900"
                          : "hover:opacity-90"
                      }`}
                      style={
                        t.next !== "CANCELLED"
                          ? { background: "rgba(10,186,181,0.15)", color: "#0ABAB5" }
                          : undefined
                      }
                    >
                      {updatingStatus ? "…" : t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inspection summary if exists */}
            {apt.inspection && (
              <div className="mx-4 mt-3 rounded-lg p-3 flex items-center gap-4"
                style={{ background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.2)" }}>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-400">{apt.inspection.totalPositive}</div>
                  <div className="text-[10px] text-white/40">Alerts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{apt.inspection.totalNegative}</div>
                  <div className="text-[10px] text-white/40">Clear</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-400">{apt.inspection.totalInconclusive}</div>
                  <div className="text-[10px] text-white/40">Inconclusive</div>
                </div>
                <button
                  onClick={() => router.push(`/inspections/${apt.inspection!.id}`)}
                  className="ml-auto text-xs font-medium flex items-center gap-1"
                  style={{ color: "#0ABAB5" }}
                >
                  View <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Scheduling */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white">
                    {format(new Date(apt.scheduledDate), "EEE, MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {format(new Date(apt.scheduledDate), "h:mm a")}
                    {apt.scheduledEndTime && ` – ${format(new Date(apt.scheduledEndTime), "h:mm a")}`}
                    {apt.estimatedMinutes && !apt.scheduledEndTime && ` · ${apt.estimatedMinutes} min`}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Customer</div>
              <button
                onClick={() => router.push(`/customers/${apt.customer.id}`)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "rgba(10,186,181,0.15)", color: "#0ABAB5" }}>
                  {apt.customer.firstName[0]}{apt.customer.lastName[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:underline">
                    {apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`}
                  </div>
                  {apt.customer.companyName && (
                    <div className="text-xs text-white/50">{apt.customer.firstName} {apt.customer.lastName}</div>
                  )}
                </div>
              </button>
              {(apt.customer.phone || apt.customer.email) && (
                <div className="mt-2 space-y-1 pl-10">
                  {apt.customer.phone && (
                    <a href={`tel:${apt.customer.phone}`} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
                      <Phone className="h-3 w-3" />
                      {apt.customer.phone}
                    </a>
                  )}
                  {apt.customer.email && (
                    <a href={`mailto:${apt.customer.email}`} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors">
                      <Mail className="h-3 w-3" />
                      {apt.customer.email}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Location</div>
              <button
                onClick={() => router.push(`/properties/${apt.property.id}`)}
                className="flex items-start gap-2 w-full text-left group"
              >
                <MapPin className="h-4 w-4 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-white group-hover:underline">{apt.property.name}</div>
                  <div className="text-xs text-white/50">{apt.property.addressLine1}</div>
                  <div className="text-xs text-white/50">{apt.property.city}, {apt.property.state} {apt.property.zip}</div>
                </div>
              </button>
              {apt.accessNotes && (
                <div className="mt-2 ml-6 text-xs text-amber-400/80 bg-amber-900/20 rounded px-2 py-1.5">
                  🔑 {apt.accessNotes}
                </div>
              )}
            </div>

            {/* Technician + K9 */}
            {(apt.technician || apt.k9Team) && (
              <div className="px-4 py-3 border-b border-white/10 space-y-2">
                <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Team</div>
                {apt.technician && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-white/40 shrink-0" />
                    <div>
                      <div className="text-sm text-white">
                        {apt.technician.firstName} {apt.technician.lastName}
                      </div>
                      <div className="text-xs text-white/40">Handler</div>
                    </div>
                  </div>
                )}
                {apt.k9Team && (
                  <div className="flex items-center gap-2">
                    <Dog className="h-4 w-4 text-white/40 shrink-0" />
                    <div>
                      <div className="text-sm text-white">
                        {dog ? dog.name : apt.k9Team.name}
                        {dog?.breed && <span className="text-white/40 text-xs ml-1">· {dog.breed}</span>}
                      </div>
                      {handler && (
                        <div className="text-xs text-white/40">
                          K9 · {handler.user.firstName} {handler.user.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Special Instructions */}
            {apt.specialInstructions && (
              <div className="mx-4 my-3 rounded-lg p-3 bg-amber-900/20 border border-amber-700/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Special Instructions</span>
                </div>
                <p className="text-xs text-amber-200/80">{apt.specialInstructions}</p>
              </div>
            )}

            {/* Notes */}
            {apt.notes && (
              <div className="px-4 py-3 border-t border-white/10">
                <div className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">Notes</div>
                <p className="text-xs text-white/60 leading-relaxed">{apt.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        {apt && (
          <div className="border-t border-white/10 p-3 space-y-2">
            {["CONFIRMED", "EN_ROUTE", "ON_SITE", "INSPECTION_STARTED"].includes(apt.status) && (
              <button
                onClick={() => router.push(`/field/${apt.id}`)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                style={{ background: "#0ABAB5" }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {apt.status === "INSPECTION_STARTED" ? "Continue Inspection" : "Begin Inspection"}
              </button>
            )}
            <button
              onClick={() => router.push(`/scheduling/${apt.id}`)}
              className="w-full py-2 rounded-xl text-sm font-medium text-white/60 flex items-center justify-center gap-1.5 hover:text-white/80 transition-colors"
            >
              Full Details <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
