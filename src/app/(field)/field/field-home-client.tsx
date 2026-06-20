"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  SCHEDULED:           { label: "Scheduled",       dot: "#3b82f6", bg: "#1d3a6e" },
  CONFIRMED:           { label: "Confirmed",        dot: "#6366f1", bg: "#1e1d4c" },
  EN_ROUTE:            { label: "En Route",         dot: "#f59e0b", bg: "#3d2d00" },
  ON_SITE:             { label: "On Site",          dot: "#f97316", bg: "#3d1c00" },
  INSPECTION_STARTED:  { label: "In Progress",      dot: "#a855f7", bg: "#2d1040" },
  INSPECTION_COMPLETE: { label: "Complete",         dot: "#22c55e", bg: "#052e16" },
  REPORT_SENT:         { label: "Report Sent",      dot: "#0ABAB5", bg: "#002626" },
  INVOICED:            { label: "Invoiced",         dot: "#0ea5e9", bg: "#002040" },
  PAID:                { label: "Paid",             dot: "#10b981", bg: "#002a1a" },
  NO_SHOW:             { label: "No Show",          dot: "#ef4444", bg: "#2a0a0a" },
};

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  NEGATIVE:            { label: "Negative",        color: "#22c55e" },
  POSITIVE_K9_ALERT:   { label: "K9 Alert",        color: "#ef4444" },
  VISUAL_CONFIRMATION: { label: "Visual +",        color: "#dc2626" },
  INCONCLUSIVE:        { label: "Inconclusive",    color: "#eab308" },
  UNABLE_TO_INSPECT:   { label: "No Access",       color: "#64748b" },
  ACCESS_DENIED:       { label: "Denied",          color: "#f97316" },
  FOLLOW_UP_REQUIRED:  { label: "Follow-Up",       color: "#3b82f6" },
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION:    "Bed Bug Inspection",
  BED_BUG_TREATMENT:     "Bed Bug Treatment",
  RODENT_INSPECTION:     "Rodent Inspection",
  GENERAL_PEST_INSPECTION: "General Pest Inspection",
  FOLLOW_UP:             "Follow-Up",
  OTHER:                 "Service Call",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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

function isActiveJob(status: string) {
  return ["EN_ROUTE", "ON_SITE", "INSPECTION_STARTED"].includes(status);
}

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
  const [selectedDay, setSelectedDay] = useState<number | null>(
    currentYear === now.getFullYear() && currentMonth === now.getMonth() ? todayNum : null
  );

  // Build calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Map day → appointments
  const byDay = useMemo(() => {
    const map: Record<number, Appt[]> = {};
    for (const a of appointments) {
      const d = new Date(a.scheduledDate).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(a);
    }
    return map;
  }, [appointments]);

  // Jobs to display: all on selected day, or today's if nothing selected
  const displayDay = selectedDay;
  const shownJobs = displayDay
    ? (byDay[displayDay] ?? [])
    : appointments.filter((a) => isToday(a.scheduledDate));

  // Active job (for prominent CTA)
  const activeJob = appointments.find((a) => isActiveJob(a.status));

  // Navigate months
  function prevMonth() {
    const d = new Date(currentYear, currentMonth - 1, 1);
    router.push(`/field?year=${d.getFullYear()}&month=${d.getMonth()}`);
  }
  function nextMonth() {
    const d = new Date(currentYear, currentMonth + 1, 1);
    router.push(`/field?year=${d.getFullYear()}&month=${d.getMonth()}`);
  }

  const isCurrentMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth();

  return (
    <div className="min-h-screen" style={{ background: "#0A0F1A" }}>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{ background: "linear-gradient(180deg, #0D1A2A 0%, #0A0F1A 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#0ABAB5" }}>
              FieldDetect Tech
            </div>
            <div className="text-xl font-bold text-white mt-0.5">
              {isCurrentMonth
                ? `Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}`
                : `${MONTHS[currentMonth]} ${currentYear}`}
            </div>
            <div className="text-sm text-slate-400">{techName}</div>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
          >
            🐾
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(10,186,181,0.12)", border: "1px solid rgba(10,186,181,0.2)" }}>
            <div className="text-2xl font-black text-white">
              {appointments.filter((a) => isToday(a.scheduledDate)).length}
            </div>
            <div className="text-xs font-semibold" style={{ color: "#0ABAB5" }}>Today</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-2xl font-black text-white">{appointments.length}</div>
            <div className="text-xs font-semibold text-slate-400">This Month</div>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-2xl font-black text-white">
              {appointments.filter((a) => ["INSPECTION_COMPLETE","REPORT_SENT","INVOICED","PAID"].includes(a.status)).length}
            </div>
            <div className="text-xs font-semibold text-slate-400">Done</div>
          </div>
        </div>
      </div>

      {/* Active job banner */}
      {activeJob && (
        <Link
          href={`/field/${activeJob.id}`}
          className="mx-4 mt-3 flex items-center justify-between rounded-2xl px-4 py-3 gap-3"
          style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
        >
          <div className="min-w-0">
            <div className="text-xs font-bold text-teal-100 uppercase tracking-wide">
              {STATUS_CONFIG[activeJob.status]?.label ?? activeJob.status} 🔴
            </div>
            <div className="font-bold text-white truncate">{activeJob.property.name}</div>
            <div className="text-xs text-teal-100">{activeJob.property.addressLine1}</div>
          </div>
          <div className="flex-shrink-0 bg-white/20 rounded-xl px-3 py-1.5 text-white text-xs font-bold">
            Continue →
          </div>
        </Link>
      )}

      {/* Calendar */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
            ‹
          </button>
          <div className="text-sm font-bold text-white">
            {MONTHS[currentMonth]} {currentYear}
          </div>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-2 pb-1">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-500 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5 px-2 pb-3">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const jobs = byDay[day] ?? [];
            const hasJobs = jobs.length > 0;
            const isSelected = selectedDay === day;
            const isTodayCell = isCurrentMonth && day === todayNum;
            const hasAlert = jobs.some((j) => j.inspection?.overallResult === "POSITIVE_K9_ALERT" || j.inspection?.overallResult === "VISUAL_CONFIRMATION");
            const hasActive = jobs.some((j) => isActiveJob(j.status));

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95"
                style={
                  isSelected
                    ? { background: "#0ABAB5", color: "#fff" }
                    : isTodayCell
                    ? { background: "rgba(10,186,181,0.2)", color: "#0ABAB5" }
                    : {}
                }
              >
                <span className={`text-xs font-bold ${!isSelected && !isTodayCell ? "text-slate-300" : ""}`}>
                  {day}
                </span>
                {hasJobs && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasAlert && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                    {hasActive && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                    {!hasAlert && !hasActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "rgba(255,255,255,0.6)" : "#0ABAB5" }} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job list */}
      <div className="px-4 mt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide">
            {selectedDay
              ? `${MONTHS[currentMonth]} ${selectedDay} — ${byDay[selectedDay]?.length ?? 0} job${(byDay[selectedDay]?.length ?? 0) !== 1 ? "s" : ""}`
              : `Today — ${shownJobs.length} job${shownJobs.length !== 1 ? "s" : ""}`}
          </h2>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="text-xs text-slate-500 hover:text-slate-300">
              Clear
            </button>
          )}
        </div>

        {shownJobs.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">🐾</div>
            <div className="text-sm text-slate-500">No jobs scheduled</div>
          </div>
        ) : (
          <div className="space-y-3">
            {shownJobs.map((job) => {
              const st = STATUS_CONFIG[job.status];
              const result = job.inspection?.overallResult ? RESULT_CONFIG[job.inspection.overallResult] : null;
              const active = isActiveJob(job.status);
              const customerName = job.customer.companyName ?? `${job.customer.firstName} ${job.customer.lastName}`;

              return (
                <Link
                  key={job.id}
                  href={`/field/${job.id}`}
                  className="block rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                  style={{ border: `1px solid ${active ? "rgba(10,186,181,0.4)" : "rgba(255,255,255,0.08)"}` }}
                >
                  {/* Top stripe */}
                  <div
                    className="h-1"
                    style={{ background: st?.dot ?? "#334155" }}
                  />
                  <div className="p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Time */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold" style={{ color: st?.dot ?? "#94a3b8" }}>
                            {fmtTime(job.scheduledDate)}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: st?.bg ?? "rgba(255,255,255,0.08)", color: st?.dot ?? "#94a3b8" }}
                          >
                            {st?.label ?? job.status}
                          </span>
                          {result && (
                            <span className="text-[10px] font-bold" style={{ color: result.color }}>
                              {result.label}
                            </span>
                          )}
                        </div>
                        {/* Property */}
                        <div className="font-bold text-white text-base truncate">{job.property.name}</div>
                        <div className="text-xs text-slate-400 truncate">{customerName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {job.property.addressLine1}, {job.property.city}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {SERVICE_LABELS[job.serviceType] ?? job.serviceType}
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Directions */}
                        <a
                          href={mapsUrl(job.property)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                          style={{ background: "rgba(10,186,181,0.15)", color: "#0ABAB5" }}
                        >
                          📍 Map
                        </a>
                        {/* Call */}
                        {job.customer.phone && (
                          <a
                            href={`tel:${job.customer.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                          >
                            📞 Call
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Open job CTA */}
                    {active && (
                      <div
                        className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #0ABAB5, #0D9488)" }}
                      >
                        Continue Inspection →
                      </div>
                    )}
                    {job.status === "CONFIRMED" || job.status === "SCHEDULED" ? (
                      <div
                        className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: "rgba(10,186,181,0.12)", color: "#0ABAB5", border: "1px solid rgba(10,186,181,0.3)" }}
                      >
                        Open Job →
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
