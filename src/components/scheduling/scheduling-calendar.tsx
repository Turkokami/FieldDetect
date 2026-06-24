"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { AppointmentSlidePanel } from "@/components/scheduling/appointment-slide-panel";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg, DatesSetArg, EventInput } from "@fullcalendar/core";
import {
  format, startOfWeek, addDays, isSameDay, isToday, isTomorrow,
  addMonths, subMonths, startOfMonth, endOfMonth,
} from "date-fns";
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

type ViewMode = "day" | "week" | "month";

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

function dayHeaderLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, MMM d");
}

function initials(apt: Appointment): string {
  if (apt.technician) return `${apt.technician.firstName[0]}${apt.technician.lastName[0]}`;
  return "—";
}

// ─── Shared appointment row card ──────────────────────────────────────────────

function AppointmentRow({
  apt,
  techColorMap,
  onSelect,
}: {
  apt: Appointment;
  techColorMap: Record<string, string>;
  onSelect: (id: string) => void;
}) {
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
      onClick={() => onSelect(apt.id)}
      className="w-full text-left rounded-xl overflow-hidden flex transition-all active:scale-[0.98] hover:shadow-sm"
      style={{ border: "1px solid var(--color-border, rgba(0,0,0,0.1))" }}
    >
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
        <div className="flex items-center gap-3 mt-2 flex-wrap">
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
}

// ─── Mobile Day View ──────────────────────────────────────────────────────────

function MobileDayView({
  date, appointments, techColorMap, onSelect,
}: {
  date: Date;
  appointments: Appointment[];
  techColorMap: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const dayAppts = useMemo(() =>
    appointments
      .filter((a) => isSameDay(new Date(a.scheduledDate), date))
      .sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate)),
    [appointments, date]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: isToday(date) ? "#0ABAB5" : undefined }}
        >
          {isToday(date) ? "Today" : format(date, "EEEE, MMMM d, yyyy")}
        </div>
        <div className="flex-1 h-px bg-border" />
        {dayAppts.length > 0 && (
          <span className="text-xs text-muted-foreground">{dayAppts.length} job{dayAppts.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {dayAppts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <div className="text-2xl mb-2">📋</div>
          <p className="text-sm font-medium text-foreground">No jobs scheduled</p>
          <p className="text-xs text-muted-foreground mt-1">Nothing on the schedule for this day</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayAppts.map((apt) => (
            <AppointmentRow key={apt.id} apt={apt} techColorMap={techColorMap} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Week View ─────────────────────────────────────────────────────────

function MobileWeekView({
  weekStart, appointments, techColorMap, onSelect,
}: {
  weekStart: Date;
  appointments: Appointment[];
  techColorMap: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const d = format(new Date(apt.scheduledDate), "yyyy-MM-dd");
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(apt);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate));
    }
    return map;
  }, [appointments]);

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayAppts = byDay.get(key) ?? [];
        const todayDay = isToday(day);

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: todayDay ? "#0ABAB5" : undefined }}
              >
                {dayHeaderLabel(day)}
              </div>
              {todayDay && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ABAB5" }} />}
              <div className="flex-1 h-px bg-border" />
              {dayAppts.length > 0 && (
                <span className="text-xs text-muted-foreground">{dayAppts.length}</span>
              )}
            </div>

            {dayAppts.length === 0 ? (
              <div className="px-1 py-2 text-xs text-muted-foreground">No jobs</div>
            ) : (
              <div className="space-y-2">
                {dayAppts.map((apt) => (
                  <AppointmentRow key={apt.id} apt={apt} techColorMap={techColorMap} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile Month View (agenda) ───────────────────────────────────────────────

function MobileMonthView({
  monthDate, appointments, techColorMap, onSelect,
}: {
  monthDate: Date;
  appointments: Appointment[];
  techColorMap: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = format(new Date(a.scheduledDate), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => +new Date(a.scheduledDate) - +new Date(b.scheduledDate));
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [appointments]);

  return (
    <div className="space-y-4">
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <div className="text-2xl mb-2">📅</div>
          <p className="text-sm font-medium text-foreground">No jobs this month</p>
          <p className="text-xs text-muted-foreground mt-1">{format(monthDate, "MMMM yyyy")} is clear</p>
        </div>
      ) : (
        grouped.map(([dateKey, dayAppts]) => {
          const date = new Date(dateKey + "T12:00:00");
          const todayDay = isToday(date);
          return (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: todayDay ? "#0ABAB5" : undefined }}
                >
                  {isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : format(date, "EEE, MMM d")}
                </div>
                {todayDay && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ABAB5" }} />}
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{dayAppts.length}</span>
              </div>
              <div className="space-y-2">
                {dayAppts.map((apt) => (
                  <AppointmentRow key={apt.id} apt={apt} techColorMap={techColorMap} onSelect={onSelect} />
                ))}
              </div>
            </div>
          );
        })
      )}
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
  const [view, setView] = useState<ViewMode>("week");
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const rangeRef = useRef<{ start: Date; end: Date } | null>(null);
  const calRef = useRef<FullCalendar>(null);

  // Mobile navigation: single canonical date for all views
  const [mobileDate, setMobileDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

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

  // Compute the mobile date range based on current view + date
  const mobileRange = useMemo(() => {
    let start: Date, end: Date;
    if (view === "day") {
      start = new Date(mobileDate.getFullYear(), mobileDate.getMonth(), mobileDate.getDate());
      end = new Date(mobileDate.getFullYear(), mobileDate.getMonth(), mobileDate.getDate(), 23, 59, 59);
    } else if (view === "week") {
      const ws = startOfWeek(mobileDate, { weekStartsOn: 1 });
      start = ws;
      end = new Date(addDays(ws, 6));
      end.setHours(23, 59, 59);
    } else {
      start = startOfMonth(mobileDate);
      end = endOfMonth(mobileDate);
      end.setHours(23, 59, 59);
    }
    return { start, end };
  }, [mobileDate, view]);

  // Fetch when mobile range changes
  useEffect(() => {
    if (!mounted || !isMobile) return;
    rangeRef.current = mobileRange;
    fetchRange(mobileRange.start, mobileRange.end);
  }, [mobileRange, mounted, isMobile, fetchRange]);

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

  // Handle view toggle — desktop uses FullCalendar API, mobile re-renders
  const handleViewChange = (v: ViewMode) => {
    setView(v);
    if (!isMobile && calRef.current) {
      const fcView = v === "day" ? "timeGridDay" : v === "week" ? "timeGridWeek" : "dayGridMonth";
      calRef.current.getApi().changeView(fcView);
    }
  };

  const navigatePrev = () => {
    if (view === "day") setMobileDate((d) => addDays(d, -1));
    else if (view === "week") setMobileDate((d) => addDays(d, -7));
    else setMobileDate((d) => subMonths(d, 1));
  };

  const navigateNext = () => {
    if (view === "day") setMobileDate((d) => addDays(d, 1));
    else if (view === "week") setMobileDate((d) => addDays(d, 7));
    else setMobileDate((d) => addMonths(d, 1));
  };

  // Label for mobile navigation header
  const mobilePeriodLabel = useMemo(() => {
    if (view === "day") {
      return isToday(mobileDate)
        ? "Today"
        : isTomorrow(mobileDate)
        ? "Tomorrow"
        : format(mobileDate, "EEE, MMM d, yyyy");
    }
    if (view === "week") {
      const ws = startOfWeek(mobileDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, "MMM d")} – ${format(we, format(ws, "MMM") === format(we, "MMM") ? "d, yyyy" : "MMM d, yyyy")}`;
    }
    return format(mobileDate, "MMMM yyyy");
  }, [mobileDate, view]);

  const events = appointments.map((a) => toEvent(a, techColorMap));

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-card min-h-[400px] flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading calendar…</span>
      </div>
    );
  }

  return (
    <>
      {/* ── View toggle (shared for both desktop and mobile) ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === v
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Mobile period navigator */}
        {isMobile && (
          <div className="flex items-center gap-1">
            <button
              onClick={navigatePrev}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground px-2 min-w-[140px] text-center">
              {mobilePeriodLabel}
            </span>
            <button
              onClick={navigateNext}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile views ── */}
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

          <Link
            href="/scheduling/new"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            <Plus className="h-4 w-4" />
            Schedule New Job
          </Link>

          {view === "day" && (
            <MobileDayView
              date={mobileDate}
              appointments={appointments}
              techColorMap={techColorMap}
              onSelect={setSelectedAptId}
            />
          )}
          {view === "week" && (
            <MobileWeekView
              weekStart={startOfWeek(mobileDate, { weekStartsOn: 1 })}
              appointments={appointments}
              techColorMap={techColorMap}
              onSelect={setSelectedAptId}
            />
          )}
          {view === "month" && (
            <MobileMonthView
              monthDate={mobileDate}
              appointments={appointments}
              techColorMap={techColorMap}
              onSelect={setSelectedAptId}
            />
          )}
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
              ref={calRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
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
