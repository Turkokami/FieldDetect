"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg, EventClickArg, DatesSetArg, EventInput } from "@fullcalendar/core";
import { format } from "date-fns";

const TECH_COLORS = [
  "#0ABAB5", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#10b981", "#ef4444", "#f97316", "#06b6d4",
];

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "#94a3b8",
  SCHEDULED: "#60a5fa",
  CONFIRMED: "#34d399",
  EN_ROUTE: "#fbbf24",
  ON_SITE: "#fb923c",
  INSPECTION_STARTED: "#a78bfa",
  INSPECTION_COMPLETE: "#10b981",
  REPORT_SENT: "#0ABAB5",
  INVOICED: "#64748b",
  PAID: "#16a34a",
  CANCELLED: "#ef4444",
};

type Technician = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

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

  const customerName =
    apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;

  return {
    id: apt.id,
    title: `${customerName} — ${apt.property.name}`,
    start,
    end,
    backgroundColor: color,
    borderColor: color,
    textColor: "#fff",
    classNames: cancelled ? ["opacity-50", "line-through"] : [],
    extendedProps: { appointment: apt },
  };
}

export function SchedulingCalendar({
  initialAppointments,
  technicians,
}: {
  initialAppointments: Appointment[];
  technicians: Technician[];
}) {
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [saving, setSaving] = useState(false);
  const rangeRef = useRef<{ start: Date; end: Date } | null>(null);

  const techColorMap: Record<string, string> = {};
  technicians.forEach((t, i) => {
    techColorMap[t.id] = TECH_COLORS[i % TECH_COLORS.length];
  });

  useEffect(() => setMounted(true), []);

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
    const customerName =
      apt.customer.companyName ?? `${apt.customer.firstName} ${apt.customer.lastName}`;

    setPendingMove({
      appointmentId: apt.id,
      title: `${customerName} — ${apt.property.name}`,
      newStart,
      newEnd,
      oldStart,
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

  const cancelMove = () => {
    pendingMove?.revert();
    setPendingMove(null);
  };

  const events = appointments.map((a) => toEvent(a, techColorMap));

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-card min-h-[520px] flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading calendar…</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Technician color legend */}
        {technicians.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 border-b border-border">
            {technicians.map((t, i) => (
              <div key={t.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: TECH_COLORS[i % TECH_COLORS.length] }}
                />
                {t.firstName} {t.lastName}
              </div>
            ))}
          </div>
        )}

        <div className="p-3 fc-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
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
              window.location.href = `/scheduling/${apt.id}`;
            }}
          />
        </div>
      </div>

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
                <span className="font-medium text-foreground">
                  {format(pendingMove.oldStart, "EEE, MMM d 'at' h:mm a")}
                </span>
              </div>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-muted-foreground w-10 shrink-0">To</span>
                <span className="font-semibold" style={{ color: "#0ABAB5" }}>
                  {format(pendingMove.newStart, "EEE, MMM d 'at' h:mm a")}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelMove}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Keep original
              </button>
              <button
                onClick={confirmMove}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-60"
                style={{ background: "#0ABAB5" }}
              >
                {saving ? "Saving…" : "Confirm move"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
