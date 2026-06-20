"use client";

import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, MapPin, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  scheduledDate: string;
  status: string;
  serviceType: string;
  estimatedMinutes?: number | null;
  customer: { firstName: string; lastName: string; companyName?: string | null };
  property: { name: string; addressLine1: string; city: string; state: string };
  technician?: { id: string; firstName: string; lastName: string } | null;
  k9Team?: { id: string; name: string } | null;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-slate-100 border-slate-300 text-slate-700",
  SCHEDULED: "bg-blue-50 border-blue-300 text-blue-800",
  CONFIRMED: "bg-green-50 border-green-300 text-green-800",
  EN_ROUTE: "bg-amber-50 border-amber-300 text-amber-800",
  ON_SITE: "bg-orange-50 border-orange-300 text-orange-800",
  INSPECTION_STARTED: "bg-purple-50 border-purple-300 text-purple-800",
  INSPECTION_COMPLETE: "bg-emerald-50 border-emerald-300 text-emerald-800",
  CANCELLED: "bg-red-50 border-red-300 text-red-700 line-through opacity-60",
};

const SERVICE_LABELS: Record<string, string> = {
  BED_BUG_INSPECTION: "K9 Inspection",
  BED_BUG_TREATMENT: "BB Treatment",
  RODENT_INSPECTION: "Rodent Insp.",
  RODENT_EXCLUSION: "Rodent Excl.",
  WILDLIFE_INSPECTION: "Wildlife Insp.",
  BIRD_EXCLUSION: "Bird Excl.",
  GOOSE_CONTROL: "Goose Control",
  GENERAL_PEST_INSPECTION: "Pest Insp.",
};

export function SchedulingCalendar({
  initialAppointments,
  technicians,
}: {
  initialAppointments: Appointment[];
  technicians: Technician[];
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    return startOfWeek(today, { weekStartsOn: 0 });
  });

  const [view, setView] = useState<"week" | "day">("week");
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const filteredAppointments = selectedTech
    ? initialAppointments.filter((a) => a.technician?.id === selectedTech)
    : initialAppointments;

  const appointmentsByDay = weekDays.reduce((acc, day) => {
    const key = format(day, "yyyy-MM-dd");
    acc[key] = filteredAppointments.filter((a) =>
      isSameDay(new Date(a.scheduledDate), day)
    );
    return acc;
  }, {} as Record<string, Appointment[]>);

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">
            {format(currentWeekStart, "MMM d")} – {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
          >
            Today
          </Button>
        </div>

        {/* Tech filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedTech === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTech(null)}
          >
            All Techs
          </Button>
          {technicians.map((tech) => (
            <Button
              key={tech.id}
              variant={selectedTech === tech.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTech(tech.id)}
            >
              {tech.firstName} {tech.lastName.charAt(0)}.
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAppts = appointmentsByDay[key] ?? [];
          const isToday = isSameDay(day, today);

          return (
            <div key={key} className="min-h-[200px]">
              {/* Day header */}
              <div className={cn(
                "text-center py-2 mb-2 rounded-md text-sm",
                isToday ? "bg-primary text-primary-foreground font-bold" : "text-slate-600"
              )}>
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className={cn("text-lg font-bold", !isToday && "text-slate-900")}>
                  {format(day, "d")}
                </div>
              </div>

              {/* Appointments */}
              <div className="space-y-1.5">
                {dayAppts.map((appt) => (
                  <Link key={appt.id} href={`/scheduling/${appt.id}`}>
                    <div
                      className={cn(
                        "p-2 rounded border text-xs cursor-pointer hover:shadow-sm transition-shadow",
                        STATUS_COLORS[appt.status] ?? "bg-slate-50 border-slate-200"
                      )}
                    >
                      <p className="font-semibold truncate">
                        {appt.customer.companyName ?? `${appt.customer.firstName} ${appt.customer.lastName}`}
                      </p>
                      <p className="text-[10px] mt-0.5 opacity-75">
                        {format(new Date(appt.scheduledDate), "h:mm a")}
                        {appt.estimatedMinutes && ` · ${appt.estimatedMinutes}m`}
                      </p>
                      <div className="flex items-center gap-1 mt-1 opacity-75">
                        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{appt.property.city}</span>
                      </div>
                      {appt.technician && (
                        <div className="flex items-center gap-1 mt-0.5 opacity-75">
                          <User className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">
                            {appt.technician.firstName} {appt.technician.lastName.charAt(0)}.
                          </span>
                        </div>
                      )}
                      <p className="text-[10px] mt-1 opacity-60">
                        {SERVICE_LABELS[appt.serviceType] ?? appt.serviceType}
                      </p>
                    </div>
                  </Link>
                ))}

                {dayAppts.length === 0 && (
                  <div className="h-16 rounded border-2 border-dashed border-slate-200 flex items-center justify-center">
                    <span className="text-xs text-slate-300">No jobs</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {Object.entries({
          SCHEDULED: "Scheduled",
          CONFIRMED: "Confirmed",
          EN_ROUTE: "En Route",
          INSPECTION_STARTED: "In Progress",
          INSPECTION_COMPLETE: "Complete",
        }).map(([status, label]) => (
          <div key={status} className={cn("text-xs px-2 py-0.5 rounded border", STATUS_COLORS[status])}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
