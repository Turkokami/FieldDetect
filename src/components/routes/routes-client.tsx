"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Appt = {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  estimatedMinutes: number | null;
  routeOrder: number | null;
  priority: number;
  property: { name: string; addressLine1: string; city: string; state: string; zip: string | null };
  customer: { firstName: string; lastName: string };
  technician: { id: string; firstName: string; lastName: string } | null;
  k9Team: { name: string } | null;
};

type Technician = {
  id: string;
  firstName: string;
  lastName: string;
};

type Props = {
  initialAppointments: Appt[];
  technicians: Technician[];
  view: string;
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION:    "Bed Bug Inspection",
  BED_BUG_TREATMENT:     "Bed Bug Treatment",
  RODENT_INSPECTION:     "Rodent Inspection",
  RODENT_EXCLUSION:      "Rodent Exclusion",
  WILDLIFE_INSPECTION:   "Wildlife Inspection",
  WILDLIFE_REMOVAL:      "Wildlife Removal",
  BIRD_EXCLUSION:        "Bird Exclusion",
  GOOSE_CONTROL:         "Goose Control",
  GENERAL_PEST_INSPECTION: "General Pest Inspection",
  GENERAL_PEST_TREATMENT:  "General Pest Treatment",
  OTHER:                 "Service Call",
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:           "bg-gray-100 text-gray-600",
  SCHEDULED:           "bg-blue-100 text-blue-700",
  CONFIRMED:           "bg-green-100 text-green-700",
  EN_ROUTE:            "bg-purple-100 text-purple-700",
  ON_SITE:             "bg-indigo-100 text-indigo-700",
  INSPECTION_STARTED:  "bg-amber-100 text-amber-700",
  REPORT_SENT:         "bg-teal-100 text-teal-700",
  INVOICED:            "bg-slate-100 text-slate-600",
};

function mapsUrl(appt: Appt) {
  const addr = `${appt.property.addressLine1}, ${appt.property.city}, ${appt.property.state} ${appt.property.zip ?? ""}`.trim();
  return `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function isToday(date: string) {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function routeSummary(stops: Appt[]): string {
  const service = stops.reduce((s, a) => s + (a.estimatedMinutes ?? 60), 0);
  const travel = Math.max(0, stops.length - 1) * 15;
  const total = service + travel;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `~${h}h ${m > 0 ? `${m}m` : ""}` : `~${m}m`;
}

export default function RoutesClient({ initialAppointments, technicians, view }: Props) {
  type StopMap = Map<string, Appt[]>;

  function buildGroups(appts: Appt[]): StopMap {
    const map: StopMap = new Map();
    for (const a of appts) {
      const key = a.technician
        ? `${a.technician.firstName} ${a.technician.lastName}__${a.technician.id}`
        : "Unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }

  const [groups, setGroups] = useState<StopMap>(() => buildGroups(initialAppointments));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const dragKey = useRef<string | null>(null);
  const dragIdx = useRef<number | null>(null);

  function allStops(): Appt[] {
    return Array.from(groups.values()).flat();
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart(key: string, idx: number) {
    dragKey.current = key;
    dragIdx.current = idx;
  }

  function onDragOver(e: React.DragEvent, key: string, idx: number) {
    e.preventDefault();
    if (dragKey.current !== key) return; // no cross-tech drag
    if (dragIdx.current === idx) return;

    setGroups((prev) => {
      const next = new Map(prev);
      const stops = [...(next.get(key) ?? [])];
      const [moved] = stops.splice(dragIdx.current!, 1);
      stops.splice(idx, 0, moved);
      dragIdx.current = idx;
      next.set(key, stops);
      return next;
    });
    setDirty(true);
  }

  function onDragEnd() {
    dragKey.current = null;
    dragIdx.current = null;
  }

  // ── Sort by time ───────────────────────────────────────────────────────────

  function sortByTime(key: string) {
    setGroups((prev) => {
      const next = new Map(prev);
      const stops = [...(next.get(key) ?? [])];
      stops.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      next.set(key, stops);
      return next;
    });
    setDirty(true);
  }

  // ── Reassign technician ────────────────────────────────────────────────────

  function reassign(apptId: string, techId: string) {
    const tech = techId ? technicians.find((t) => t.id === techId) ?? null : null;

    setGroups((prev) => {
      // Remove from current group
      let movedAppt: Appt | undefined;
      let fromKey: string | undefined;
      const next = new Map(prev);
      for (const [k, stops] of next) {
        const idx = stops.findIndex((s) => s.id === apptId);
        if (idx !== -1) {
          movedAppt = { ...stops[idx], technician: tech };
          fromKey = k;
          const updated = [...stops];
          updated.splice(idx, 1);
          if (updated.length > 0) next.set(k, updated);
          else next.delete(k);
          break;
        }
      }
      if (!movedAppt) return prev;

      const newKey = tech ? `${tech.firstName} ${tech.lastName}__${tech.id}` : "Unassigned__";
      if (!next.has(newKey)) next.set(newKey, []);
      next.get(newKey)!.push(movedAppt);
      return next;
    });

    setAssigningId(null);
    setDirty(true);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function saveRoutes() {
    setSaving(true);
    setSaveError("");
    const updates: { id: string; routeOrder: number; technicianId: string | null }[] = [];
    for (const [key, stops] of groups) {
      const techId = key.includes("__") ? key.split("__")[1] || null : null;
      stops.forEach((s, idx) => {
        updates.push({ id: s.id, routeOrder: idx, technicianId: techId || null });
      });
    }
    try {
      const res = await fetch("/api/routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save");
      } else {
        setDirty(false);
      }
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const groupEntries = Array.from(groups.entries());

  return (
    <div className="space-y-4">
      {/* Save bar */}
      {dirty && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-sm text-amber-800 font-medium">You have unsaved route changes</span>
          <div className="flex items-center gap-3">
            {saveError && <span className="text-xs text-destructive">{saveError}</span>}
            <button
              onClick={() => { setGroups(buildGroups(initialAppointments)); setDirty(false); setSaveError(""); }}
              className="text-sm text-muted-foreground hover:underline"
            >
              Discard
            </button>
            <button
              onClick={saveRoutes}
              disabled={saving}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Route Order"}
            </button>
          </div>
        </div>
      )}

      {groupEntries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📍</div>
          <p className="text-lg font-semibold text-foreground mb-1">
            No appointments {view === "today" ? "today" : "this week"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">Schedule appointments to see routes here.</p>
          <Link href="/scheduling/new" className="inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90">
            Schedule an Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {groupEntries.map(([key, stops]) => {
            const techName = key.split("__")[0];
            const techId = key.split("__")[1] || null;
            const initials = techName === "Unassigned" ? "?" : techName.split(" ").map((n) => n[0]).join("");

            // Group stops by day for week view
            const byDay = new Map<string, Appt[]>();
            for (const s of stops) {
              const label = formatDay(s.scheduledDate);
              if (!byDay.has(label)) byDay.set(label, []);
              byDay.get(label)!.push(s);
            }

            return (
              <div key={key} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Tech header */}
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground text-sm">{techName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {stops.length} stop{stops.length !== 1 ? "s" : ""} · {routeSummary(stops)}
                    </span>
                    <button
                      onClick={() => sortByTime(key)}
                      title="Sort stops by scheduled time"
                      className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Sort by time
                    </button>
                  </div>
                </div>

                {/* Stops */}
                <div>
                  {Array.from(byDay.entries()).map(([dayLabel, dayStops]) => (
                    <div key={dayLabel}>
                      {view === "week" && (
                        <div className={`px-5 py-1.5 text-xs font-semibold border-b border-border/50 ${
                          isToday(dayStops[0].scheduledDate)
                            ? "bg-primary/5 text-primary"
                            : "bg-muted/20 text-muted-foreground"
                        }`}>
                          {isToday(dayStops[0].scheduledDate) ? "Today — " : ""}{dayLabel}
                        </div>
                      )}
                      <div className="divide-y divide-border/50">
                        {dayStops.map((appt) => {
                          const stopIdx = stops.indexOf(appt);
                          const isLastInDay = dayStops.indexOf(appt) === dayStops.length - 1;
                          return (
                            <div
                              key={appt.id}
                              draggable
                              onDragStart={() => onDragStart(key, stopIdx)}
                              onDragOver={(e) => onDragOver(e, key, stopIdx)}
                              onDragEnd={onDragEnd}
                              className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors cursor-grab active:cursor-grabbing select-none group"
                            >
                              {/* Drag handle + stop number */}
                              <div className="flex flex-col items-center pt-0.5 shrink-0">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  appt.priority >= 2 ? "bg-red-100 text-red-700" :
                                  appt.priority >= 1 ? "bg-orange-100 text-orange-700" :
                                  "bg-primary/10 text-primary"
                                }`}>
                                  {stopIdx + 1}
                                </div>
                                {!isLastInDay && <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <Link
                                    href={`/scheduling/${appt.id}`}
                                    className="font-medium text-sm text-foreground hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {appt.property.name}
                                  </Link>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                                    {appt.status.replace(/_/g, " ")}
                                  </span>
                                  {appt.priority >= 2 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Urgent</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {appt.property.addressLine1}, {appt.property.city}
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{formatTime(appt.scheduledDate)}</span>
                                  {appt.estimatedMinutes && <span>{appt.estimatedMinutes}m</span>}
                                  <span>{appt.customer.firstName} {appt.customer.lastName}</span>
                                  <span>{SERVICE_LABELS[appt.serviceType] ?? appt.serviceType.replace(/_/g, " ")}</span>
                                  {appt.k9Team && <span>🐕 {appt.k9Team.name}</span>}
                                </div>

                                {/* Technician reassignment */}
                                {assigningId === appt.id ? (
                                  <div className="flex items-center gap-2 mt-2">
                                    <select
                                      defaultValue={techId ?? ""}
                                      onChange={(e) => reassign(appt.id, e.target.value)}
                                      className="h-7 px-2 rounded border border-border bg-background text-xs text-foreground focus:outline-none"
                                      autoFocus
                                    >
                                      <option value="">Unassigned</option>
                                      {technicians.map((t) => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                      ))}
                                    </select>
                                    <button onClick={() => setAssigningId(null)} className="text-xs text-muted-foreground hover:underline">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setAssigningId(appt.id); }}
                                    className="mt-1 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Reassign tech →
                                  </button>
                                )}
                              </div>

                              {/* Maps button */}
                              <div className="flex items-center gap-1 shrink-0">
                                {/* drag handle dots */}
                                <div className="w-4 flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
                                  {[0,1,2].map((i) => (
                                    <div key={i} className="flex gap-0.5">
                                      <div className="w-1 h-1 rounded-full bg-foreground" />
                                      <div className="w-1 h-1 rounded-full bg-foreground" />
                                    </div>
                                  ))}
                                </div>
                                <a
                                  href={mapsUrl(appt)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="Open in Maps"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Multi-stop maps link */}
                {stops.length > 1 && (
                  <div className="px-5 py-2 border-t border-border/50 bg-muted/10">
                    <a
                      href={`https://maps.google.com/maps/dir/${stops.map((s) => encodeURIComponent(`${s.property.addressLine1}, ${s.property.city}, ${s.property.state}`)).join("/")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Open full route in Maps →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
