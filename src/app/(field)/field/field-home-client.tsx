"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, Phone, Clock, ChevronRight, CheckCircle2,
  AlertTriangle, Navigation, CalendarDays, X,
} from "lucide-react";

type Appt = {
  id: string;
  status: string;
  serviceType: string;
  scheduledDate: string;
  scheduledEndTime: string | null;
  estimatedMinutes: number | null;
  customer: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    phone: string | null;
  };
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zip: string | null;
  };
  inspection: {
    id: string;
    overallResult: string | null;
    totalPositive: number;
  } | null;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  SCHEDULED:           { label: "Scheduled",    color: "#3b82f6", bg: "rgba(59,130,246,0.12)"  },
  CONFIRMED:           { label: "Confirmed",    color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
  EN_ROUTE:            { label: "En Route",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  ON_SITE:             { label: "On Site",      color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  INSPECTION_STARTED:  { label: "In Progress",  color: "#a855f7", bg: "rgba(168,85,247,0.12)"  },
  INSPECTION_COMPLETE: { label: "Complete",     color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  REPORT_SENT:         { label: "Report Sent",  color: "#0ABAB5", bg: "rgba(10,186,181,0.12)"  },
  INVOICED:            { label: "Invoiced",     color: "#0ea5e9", bg: "rgba(14,165,233,0.12)"  },
  PAID:                { label: "Paid",         color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  NO_SHOW:             { label: "No Show",      color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const RESULT_CFG: Record<string, { label: string; color: string; emoji: string }> = {
  NEGATIVE:            { label: "All Clear",    color: "#22c55e", emoji: "✅" },
  POSITIVE_K9_ALERT:   { label: "K9 Alert",    color: "#ef4444", emoji: "🚨" },
  VISUAL_CONFIRMATION: { label: "Visual +",    color: "#dc2626", emoji: "👁️" },
  INCONCLUSIVE:        { label: "Inconclusive", color: "#eab308", emoji: "❓" },
  UNABLE_TO_INSPECT:   { label: "No Access",   color: "#64748b", emoji: "🚫" },
  ACCESS_DENIED:       { label: "Denied",      color: "#f97316", emoji: "⛔" },
  FOLLOW_UP_REQUIRED:  { label: "Follow-Up",   color: "#3b82f6", emoji: "📋" },
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION:       "Bed Bug Inspection",
  BED_BUG_TREATMENT:        "Bed Bug Treatment",
  RODENT_INSPECTION:        "Rodent Inspection",
  GENERAL_PEST_INSPECTION:  "General Pest Inspection",
  FOLLOW_UP:                "Follow-Up Inspection",
  OTHER:                    "Service Call",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function mapsUrl(property: Appt["property"]) {
  const q = encodeURIComponent(`${property.addressLine1}, ${property.city}, ${property.state} ${property.zip ?? ""}`);
  return `https://maps.apple.com/?q=${q}`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isActive(status: string) {
  return ["EN_ROUTE", "ON_SITE", "INSPECTION_STARTED"].includes(status);
}

function isDone(status: string) {
  return ["INSPECTION_COMPLETE","REPORT_SENT","INVOICED","PAID"].includes(status);
}

function isActionable(status: string) {
  return ["SCHEDULED","CONFIRMED","EN_ROUTE","ON_SITE","INSPECTION_STARTED"].includes(status);
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dt.getTime() === today.getTime()) {
    return `Today · ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  }
  if (dt.getTime() === tomorrow.getTime()) {
    return `Tomorrow · ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job, stopNum, isLast }: { job: Appt; stopNum: number; isLast: boolean }) {
  const st = STATUS_CFG[job.status] ?? STATUS_CFG.SCHEDULED;
  const result = job.inspection?.overallResult ? RESULT_CFG[job.inspection.overallResult] : null;
  const active = isActive(job.status);
  const done = isDone(job.status);
  const actionable = isActionable(job.status);
  const customerName = job.customer.companyName ?? `${job.customer.firstName} ${job.customer.lastName}`;
  const hasAlert = result && ["POSITIVE_K9_ALERT","VISUAL_CONFIRMATION"].includes(job.inspection?.overallResult ?? "");

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 z-10"
          style={
            done
              ? { background: "rgba(34,197,94,0.15)", borderColor: "#22c55e", color: "#22c55e" }
              : active
              ? { background: st.color, borderColor: st.color, color: "#fff" }
              : { background: "rgba(255,255,255,0.06)", borderColor: st.color, color: st.color }
          }
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : stopNum}
        </div>
        {!isLast && (
          <div className="flex-1 w-px mt-1" style={{ background: "rgba(255,255,255,0.08)", minHeight: 20 }} />
        )}
      </div>

      {/* Card */}
      <Link
        href={`/field/${job.id}`}
        className="flex-1 mb-4 rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
        style={{
          background: active
            ? "rgba(10,186,181,0.06)"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${active ? "rgba(10,186,181,0.3)" : hasAlert ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        {/* Status bar */}
        <div className="h-0.5" style={{ background: st.color, opacity: done ? 0.4 : 1 }} />

        <div className="p-4">
          {/* Time + status row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: st.color }}>
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#64748b" }} />
                {fmtTime(job.scheduledDate)}
                {job.scheduledEndTime && (
                  <span className="font-normal text-slate-500"> – {fmtTime(job.scheduledEndTime)}</span>
                )}
                {!job.scheduledEndTime && job.estimatedMinutes && (
                  <span className="font-normal text-slate-500"> · {job.estimatedMinutes}m</span>
                )}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>
            {/* Quick actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {job.customer.phone && (
                <a
                  href={`tel:${job.customer.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Phone className="h-3.5 w-3.5" style={{ color: "#94a3b8" }} />
                </a>
              )}
              <a
                href={mapsUrl(job.property)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(10,186,181,0.12)", border: "1px solid rgba(10,186,181,0.25)" }}
              >
                <Navigation className="h-3.5 w-3.5" style={{ color: "#0ABAB5" }} />
              </a>
            </div>
          </div>

          {/* Property + service */}
          <div className="mb-2">
            <div className="font-bold text-white text-base leading-snug">{job.property.name}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: "#0ABAB5" }}>
              {SERVICE_LABELS[job.serviceType] ?? job.serviceType}
            </div>
          </div>

          {/* Address + customer */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
              <span className="truncate">{job.property.addressLine1}, {job.property.city}</span>
            </div>
            <div className="text-xs text-slate-500 truncate pl-4">{customerName}</div>
          </div>

          {/* Result badge */}
          {result && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${result.color}18`, color: result.color, border: `1px solid ${result.color}30` }}
            >
              <span>{result.emoji}</span>
              {result.label}
              {hasAlert && job.inspection?.totalPositive && job.inspection.totalPositive > 0 && (
                <span className="font-bold">· {job.inspection.totalPositive} unit{job.inspection.totalPositive > 1 ? "s" : ""}</span>
              )}
            </div>
          )}

          {/* CTA */}
          {actionable && (
            <div
              className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
              style={
                active
                  ? { background: "linear-gradient(135deg, #0ABAB5, #0D9488)", color: "#fff" }
                  : { background: "rgba(10,186,181,0.1)", border: "1px solid rgba(10,186,181,0.3)", color: "#0ABAB5" }
              }
            >
              {active ? "Continue Inspection" : "Open Job"}
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// ─── Date group separator ─────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  const isToday = label.startsWith("Today");
  const isTomorrow = label.startsWith("Tomorrow");
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg"
        style={
          isToday
            ? { background: "rgba(10,186,181,0.15)", color: "#0ABAB5" }
            : isTomorrow
            ? { background: "rgba(99,102,241,0.12)", color: "#818cf8" }
            : { background: "rgba(255,255,255,0.06)", color: "#64748b" }
        }
      >
        {label}
      </div>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FieldHome({
  appointments,
  techName,
  currentYear,
  currentMonth,
}: {
  appointments: Appt[];
  techName: string;
  currentYear: number;
  currentMonth: number;
}) {
  const router = useRouter();
  const now = new Date();
  const todayNum = now.getDate();
  const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Only calendar month appointments go in byDay (avoid cross-month day number collision)
  const byDay = useMemo(() => {
    const map: Record<number, Appt[]> = {};
    for (const a of appointments) {
      const d = new Date(a.scheduledDate);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(a);
      }
    }
    return map;
  }, [appointments, currentYear, currentMonth]);

  // Upcoming = today onwards, sorted by time, excluding fully-done statuses
  const upcomingJobs = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return appointments
      .filter((a) => new Date(a.scheduledDate) >= startOfToday)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [appointments]);

  // Group upcoming by date
  const groupedUpcoming = useMemo(() => {
    const groups: { key: string; label: string; jobs: Appt[] }[] = [];
    const map: Record<string, { key: string; label: string; jobs: Appt[] }> = {};
    for (const job of upcomingJobs) {
      const d = new Date(job.scheduledDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) {
        const entry = { key, label: dayLabel(job.scheduledDate), jobs: [] as Appt[] };
        map[key] = entry;
        groups.push(entry);
      }
      map[key].jobs.push(job);
    }
    return groups;
  }, [upcomingJobs]);

  // Jobs shown when a specific calendar day is selected
  const selectedDayJobs = selectedDay ? (byDay[selectedDay] ?? []) : [];

  const activeJob = appointments.find((a) => isActive(a.status));

  const todayCount = isCurrentMonth ? (byDay[todayNum]?.length ?? 0) : 0;
  const monthCount = Object.values(byDay).flat().length;
  const alertCount = appointments.filter((a) =>
    a.inspection?.overallResult === "POSITIVE_K9_ALERT" ||
    a.inspection?.overallResult === "VISUAL_CONFIRMATION"
  ).length;

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  function prevMonth() {
    const d = new Date(currentYear, currentMonth - 1, 1);
    router.push(`/field?year=${d.getFullYear()}&month=${d.getMonth()}`);
  }
  function nextMonth() {
    const d = new Date(currentYear, currentMonth + 1, 1);
    router.push(`/field?year=${d.getFullYear()}&month=${d.getMonth()}`);
  }

  const selectedDayStr = selectedDay
    ? new Date(currentYear, currentMonth, selectedDay).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen" style={{ background: "#0A0F1A" }}>

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5" style={{ background: "linear-gradient(180deg, #0D1A2A 0%, #0A0F1A 100%)" }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: "#0ABAB5" }}>
              FieldDetect
            </div>
            <div className="text-2xl font-black text-white leading-tight">
              {isCurrentMonth ? greeting : `${MONTHS[currentMonth]} ${currentYear}`}
            </div>
            <div className="text-sm mt-0.5 text-slate-400">{techName}</div>
          </div>
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            🐾
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(10,186,181,0.12)", border: "1px solid rgba(10,186,181,0.22)" }}>
            <div className="text-2xl font-black text-white">{todayCount}</div>
            <div className="text-[11px] font-semibold mt-0.5" style={{ color: "#0ABAB5" }}>Today</div>
          </div>
          <div className="rounded-2xl px-3 py-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-2xl font-black text-white">{upcomingJobs.length}</div>
            <div className="text-[11px] font-semibold mt-0.5 text-slate-400">Upcoming</div>
          </div>
          <div
            className="rounded-2xl px-3 py-3 text-center"
            style={
              alertCount > 0
                ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)" }
                : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {alertCount > 0 ? (
              <>
                <div className="text-2xl font-black" style={{ color: "#ef4444" }}>{alertCount}</div>
                <div className="text-[11px] font-semibold mt-0.5 flex items-center justify-center gap-0.5" style={{ color: "#ef4444" }}>
                  <AlertTriangle className="h-2.5 w-2.5" /> Alerts
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-black text-white">{monthCount}</div>
                <div className="text-[11px] font-semibold mt-0.5 text-slate-400">Month</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Active job banner ── */}
      {activeJob && (
        <div className="px-4 mt-3">
          <Link
            href={`/field/${activeJob.id}`}
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 gap-3"
            style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-teal-100 mb-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                {STATUS_CFG[activeJob.status]?.label ?? "Active"}
              </div>
              <div className="font-bold text-white truncate text-base">{activeJob.property.name}</div>
              <div className="text-xs text-teal-100 truncate">{activeJob.property.addressLine1}, {activeJob.property.city}</div>
            </div>
            <div className="shrink-0 flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 text-white text-sm font-bold">
              Resume <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}

      {/* ── Calendar toggle ── */}
      <div className="px-4 mt-4">
        <button
          onClick={() => {
            setCalendarOpen((o) => !o);
            if (calendarOpen) setSelectedDay(null);
          }}
          className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
          style={{
            background: calendarOpen ? "rgba(10,186,181,0.08)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${calendarOpen ? "rgba(10,186,181,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <span className="flex items-center gap-2" style={{ color: calendarOpen ? "#0ABAB5" : "#94a3b8" }}>
            <CalendarDays className="h-4 w-4" />
            {calendarOpen ? `${MONTHS[currentMonth]} ${currentYear}` : "View Calendar"}
          </span>
          <span className="text-xs" style={{ color: "#475569" }}>{calendarOpen ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* ── Calendar ── */}
      {calendarOpen && (
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors text-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              ‹
            </button>
            <span className="text-sm font-bold text-white">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors text-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 px-2 pb-1">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-600 uppercase py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const jobs = byDay[day] ?? [];
              const hasJobs = jobs.length > 0;
              const isSelected = selectedDay === day;
              const isTodayCell = isCurrentMonth && day === todayNum;
              const hasAlertDay = jobs.some((j) =>
                j.inspection?.overallResult === "POSITIVE_K9_ALERT" ||
                j.inspection?.overallResult === "VISUAL_CONFIRMATION"
              );
              const hasActiveJob = jobs.some((j) => isActive(j.status));

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95"
                  style={
                    isSelected
                      ? { background: "#0ABAB5", color: "#fff" }
                      : isTodayCell
                      ? { background: "rgba(10,186,181,0.18)", color: "#0ABAB5" }
                      : {}
                  }
                >
                  <span className={`text-xs font-bold ${!isSelected && !isTodayCell ? "text-slate-300" : ""}`}>
                    {day}
                  </span>
                  {hasJobs && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasAlertDay
                        ? <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        : hasActiveJob
                        ? <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                        : <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "rgba(255,255,255,0.7)" : "#0ABAB5" }} />}
                      {jobs.length > 1 && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.5)" }} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Job List ── */}
      <div className="px-4 mt-5 pb-6">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-white">
              {selectedDay ? selectedDayStr : "Upcoming Jobs"}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              {selectedDay
                ? selectedDayJobs.length === 0
                  ? "No jobs on this day"
                  : `${selectedDayJobs.length} stop${selectedDayJobs.length !== 1 ? "s" : ""}`
                : upcomingJobs.length === 0
                ? "No upcoming jobs scheduled"
                : `${upcomingJobs.length} job${upcomingJobs.length !== 1 ? "s" : ""} scheduled`}
            </div>
          </div>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Selected day jobs */}
        {selectedDay ? (
          selectedDayJobs.length === 0 ? (
            <EmptyState message="No jobs scheduled for this day" sub="Pick another day on the calendar" />
          ) : (
            <div>
              {selectedDayJobs.map((job, idx) => (
                <JobCard key={job.id} job={job} stopNum={idx + 1} isLast={idx === selectedDayJobs.length - 1} />
              ))}
            </div>
          )
        ) : (
          /* Upcoming jobs grouped by date */
          upcomingJobs.length === 0 ? (
            <EmptyState
              message="No upcoming jobs"
              sub="Check back when new appointments are scheduled"
            />
          ) : (
            <div>
              {groupedUpcoming.map((group) => (
                <div key={group.key} className="mb-2">
                  <DateHeader label={group.label} />
                  {group.jobs.map((job, idx) => (
                    <JobCard key={job.id} job={job} stopNum={idx + 1} isLast={idx === group.jobs.length - 1} />
                  ))}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div
      className="rounded-2xl px-6 py-12 flex flex-col items-center text-center"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
        style={{ background: "rgba(10,186,181,0.1)", border: "1px solid rgba(10,186,181,0.2)" }}
      >
        🐾
      </div>
      <div className="font-semibold text-white mb-1">{message}</div>
      <div className="text-sm text-slate-500">{sub}</div>
    </div>
  );
}
