"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppointmentSlidePanel } from "@/components/scheduling/appointment-slide-panel";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg, DatesSetArg, EventInput } from "@fullcalendar/core";
import { format, startOfWeek, addWeeks, addDays, isSameDay, isToday, isTomorrow } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const TECH_COLORS = [
  "#0ABAB5", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#10b981", "#ef4444", "#f97316", "#06b6d4",
];

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:           "#94a3b8",
  SCHEDULED:           "#60a5fa",
  CONFIRMED:           "#34d399",
  EN_ROUTE:            "#fbbf24",
  ON_SITE:             "#fb923c",
  INSPECTION_STARTED:  "#a78bfa",
  INSPECTION_COMPLETE: "#10b981",
  REPORT_SENT:         "#0ABAB5",
  INVOICED:            "#64748b",
  PAID:                "#16a34a",
  CANCELLED:           "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED:           "Requested",
  SCHEDULED:           "Scheduled",
  CONFIRMED:           "Confirmed",
  EN_ROUTE:            "En Route",
  ON_SITE:             "On Site",
  INSPECTION_STARTED:  "Inspecting",
  INSPECTION_COMPLETE: "Complete",
  REPORT_SENT:         "Report Sent",
  INVOICED:            "Invoiced",
  PAID:                "Paid",
  CANCELLED:           "Cancelled",
  NO_SHOW:             "No Show",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Technician = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

type Appointment = {
  id: string;
  title: string | null;
  scheduledDate: string;
  scheduledEndTime: string | null;
  estimatedMinutes: number | null;
  status: string;
  serviceType: string;
  customer: { firstName: string; lastName: string; companyName: string | null };
  property: { name: string; addressLine1: string; city: string; state: string };
  technician: { id: string; firstName: string; lastName: string } | null;
  k9Team: { id: string; name: string } | null;
};

type PendingMove = {
  appointmentId: string;
  title: string;
  newStart: Date;
  newEnd: Date;
  oldStart: Date;
  revert: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toEvent(apt: Appointment, techColorMap: Record<string, string>): EventInput {
  const start = new Date(apt.scheduledDate);
  let end: Date;
  if (apt.scheduledEndTime) {
    end = new Date(apt.scheduledEndTime);
  } else if (apt.estimatedMinutes) {
    end = new Date(start.getTime() + apt.estimatedMinutes * 60_000);
  } else {
    end = new Date(start.getTime() + 60 * 60_000);
  }
  const cancelled = apt.status === "CANCELLED";
  const color = cancelled
    ? "#ef4444"
    : apt.technician
    ? (techColorMap[apt.technician.id] ?? "#64748b")
    : (STATUS_COLORS[apt.status] ?? "#64748b");
  const customerName = apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;
  return {
    id: apt.id,
    title: `${customerName} — ${apt.property.name}`,
    start, end,
    backgroundColor: color, borderColor: color, textColor: "#fff",
    classNames: cancelled ? ["opacity-50", "line-through"] : [],
    extendedProps: { appointment: apt },
  };
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

function initials(apt: Appointment): string {
  if (apt.technician) return `${apt.technician.firstName[0]}${apt.technician.lastName[0]}`;
  return "—";
}

// ─── Mobile week list view ────────────────────────────────────────────────────

function MobileScheduleView({
  appointments,
  weekStart,
  techColorMap,
  onPrevWeek,
  onNextWeek,
  onSelect,
}: {
  appointments: Appointment[];
  weekStart: Date;
  techColorMap: Record<string, string>;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelect: (id: string) => void;
}) {
  const weekEnd = addDays(weekStart, 6);

  // Build 7-day slots
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group appointments into their day slot
  const byDay = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const d = format(new Date(apt.scheduledDate), "yyyy-MM-dd");
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(apt);
  }
  // Sort within each day
  for (const list of byDay.values()) {
    list.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }

  const totalThisWeek = appointments.filter((a) => {
    const d = new Date(a.scheduledDate);
    return d >= weekStart && d <= weekEnd;
  }).length;

  return (
    <div className="space-y-0">
      {/* Week nav header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          onClick={onPrevWeek}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-foreground text-sm">
            {format(weekStart, "MMM d")} – {format(weekEnd, isToday(weekStart) || format(weekStart, "MMM") === format(weekEnd, "MMM") ? "d, yyyy" : "MMM d, yyyy")}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {totalThisWeek} job{totalThisWeek !== 1 ? "s" : ""} this week
          </div>
        </div>
        <button
          onClick={onNextWeek}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day sections */}
      <div className="space-y-4">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayApts = byDay.get(key) ?? [];
          const todayDay = isToday(day);

          return (
            <div key={key}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: todayDay ? "#0ABAB5" : undefined }}
                >
                  {dayLabel(day)}
                </div>
                {todayDay && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ABAB5" }} />
                )}
                <div className="flex-1 h-px bg-border" />
                {dayApts.length > 0 && (
                  <span className="text-xs text-muted-foreground">{dayApts.length}</span>
                )}
              </div>

              {dayApts.length === 0 ? (
                <div className="px-1 py-2 text-xs text-muted-foreground">No jobs</div>
              ) : (
                <div className="space-y-2">
                  {dayApts.map((apt) => {
                    const start = new Date(apt.scheduledDate);
                    const statusColor = STATUS_COLORS[apt.status] ?? "#64748b";
                    const techColor = apt.technician
                      ? (techColorMap[apt.technician.id] ?? "#64748b")
                      : statusColor;
                    const cancelled = apt.status === "CANCELLED";
                    const customerName = apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;
                    const endMin = apt.estimatedMinutes ?? 60;
                    const endTime = apt.scheduledEndTime
                      ? new Date(apt.scheduledEndTime)
                      : new Date(start.getTime() + endMin * 60_000);

                    return (
                      <button
                        key={apt.id}
                        onClick={() => onSelect(apt.id)}
                        className="w-full text-left rounded-xl overflow-hidden flex transition-all active:scale-[0.98]"
                        style={{ border: "1px solid var(--color-border, rgba(0,0,0,0.1))" }}
                      >
                        {/* Color stripe */}
                        <div className="w-1 shrink-0" style={{ background: techColor }} />

                        <div className="flex-1 px-3 py-2.5 bg-card min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className={`font-semibold text-sm text-foreground truncate ${cancelled ? "line-through opacity-50" : ""}`}>
                                {customerName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {apt.property.name}
                              </div>
                            </div>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                              style={{ background: `${statusColor}20`, color: statusColor }}
                            >
                              {STATUS_LABELS[apt.status] ?? apt.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {format(start, "h:mm a")}
                              {" – "}
                              {format(endTime, "h:mm a")}
                            </span>
                            {apt.technician && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                  style={{ background: techColor }}
                                >
                                  {initials(apt)}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {apt.technician.firstName} {apt.technician.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SchedulingCalendar({
  initialAppointments,
  technicians,
}: {
  initialAppointments: Appointment[];
  technicians: Technician[];
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const rangeRef = useRef<{ start: Date; end: Date } | null>(null);

  // Mobile week navigation state — start on Monday of current week
  const [mobileWeekStart, setMobileWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const techColorMap: Record<string, string> = {};
  technicians.forEach((t, i) => { techColorMap[t.id] = TECH_COLORS[i % TECH_COLORS.length]; });

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchRange = useCallback(async (start: Date, end: Date) => {
    const params = new URLSearchParams({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      pageSize: "500",
    });
    const res = await fetch(`/api/appointments?${params}`);
    if (res.ok) {
      const json = await res.json();
      setAppointments(json.data ?? []);
    }
  }, []);

  // Fetch when mobile week changes
  useEffect(() => {
    if (!mounted || !isMobile) return;
    const start = mobileWeekStart;
    const end = addDays(mobileWeekStart, 6);
    end.setHours(23, 59, 59);
    rangeRef.current = { start, end };
    fetchRange(start, end);
  }, [mobileWeekStart, mounted, isMobile, fetchRange]);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      rangeRef.current = { start: arg.start, end: arg.end };
      fetchRange(arg.start, arg.end);
    },
    [fetchRange],
  );

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const apt = info.event.extendedProps.appointment as Appointment;
    const newStart = info.event.start!;
    const newEnd = info.event.end ?? new Date(newStart.getTime() + 60 * 60_000);
    const oldStart = info.oldEvent.start!;
    const customerName = apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;
    setPendingMove({
      appointmentId: apt.id,
      title: `${customerName} — ${apt.property.name}`,
      newStart, newEnd, oldStart,
      revert: info.revert,
    });
  }, []);

  const confirmMove = async () => {
    if (!pendingMove) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${pendingMove.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: pendingMove.newStart.toISOString(),
          scheduledEndTime: pendingMove.newEnd.toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      if (rangeRef.current) fetchRange(rangeRef.current.start, rangeRef.current.end);
      setPendingMove(null);
    } catch {
      pendingMove.revert();
      setPendingMove(null);
    } finally {
      setSaving(false);
    }
  };

  const cancelMove = () => { pendingMove?.revert(); setPendingMove(null); };

  const events = appointments.map((a) => toEvent(a, techColorMap));

  const goToPrevWeek = () => setMobileWeekStart((w) => addWeeks(w, -1));
  const goToNextWeek = () => setMobileWeekStart((w) => addWeeks(w, 1));

  // Filter appointments for the current mobile week
  const mobileWeekEnd = addDays(mobileWeekStart, 6);
  const mobileAppointments = appointments.filter((a) => {
    const d = new Date(a.scheduledDate);
    return d >= mobileWeekStart && d <= mobileWeekEnd;
  });

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-card min-h-[400px] flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading calendar…</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile list view ── */}
      {isMobile && (
        <div className="space-y-3">
          {/* Technician legend */}
          {technicians.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {technicians.map((t, i) => (
                <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TECH_COLORS[i % TECH_COLORS.length] }} />
                  {t.firstName} {t.lastName[0]}.
                </div>
              ))}
            </div>
          )}

          {/* Schedule New Job button for mobile */}
          <Link
            href="/scheduling/new"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            <Plus className="h-4 w-4" />
            Schedule New Job
          </Link>

          <MobileScheduleView
            appointments={mobileAppointments}
            weekStart={mobileWeekStart}
            techColorMap={techColorMap}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onSelect={setSelectedAptId}
          />
        </div>
      )}

      {/* ── Desktop calendar ── */}
      {!isMobile && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {technicians.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-b border-border">
              {technicians.map((t, i) => (
                <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: TECH_COLORS[i % TECH_COLORS.length] }} />
                  {t.firstName} {t.lastName}
                </div>
              ))}
            </div>
          )}
          <div className="p-3 fc-wrapper">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
              initialView="timeGridWeek"
              events={events}
              editable
              droppable
              eventDrop={handleEventDrop}
              datesSet={handleDatesSet}
              height="auto"
              slotMinTime="06:00:00"
              slotMaxTime="21:00:00"
              allDaySlot={false}
              nowIndicator
              slotDuration="00:30:00"
              businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: "07:00", endTime: "18:00" }}
              eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
              eventClick={(info: EventClickArg) => {
                const apt = info.event.extendedProps.appointment as Appointment;
                setSelectedAptId(apt.id);
              }}
            />
          </div>
        </div>
      )}

      {/* Appointment slide panel */}
      {selectedAptId && (
        <AppointmentSlidePanel
          appointmentId={selectedAptId}
          onClose={() => setSelectedAptId(null)}
          onStatusChange={() => rangeRef.current && fetchRange(rangeRef.current.start, rangeRef.current.end)}
        />
      )}

      {/* Reschedule confirmation dialog */}
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelMove} />
          <div className="relative bg-card rounded-xl border border-border shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-foreground text-base mb-1">Reschedule appointment?</h3>
            <p className="text-sm font-medium text-foreground mb-3 truncate">{pendingMove.title}</p>
            <div className="space-y-1.5 mb-5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground w-10 shrink-0">From</span>
                <span className="font-medium text-foreground">{format(pendingMove.oldStart, "EEE, MMM d 'at' h:mm a")}</span>
              </div>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground w-10 shrink-0">To</span>
                <span className="font-semibold" style={{ color: "#0ABAB5" }}>{format(pendingMove.newStart, "EEE, MMM d 'at' h:mm a")}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={cancelMove} className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
                Keep original
              </button>
              <button onClick={confirmMove} disabled={saving} className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-60" style={{ background: "#0ABAB5" }}>
                {saving ? "Saving…" : "Confirm move"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
