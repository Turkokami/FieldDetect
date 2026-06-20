import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Calendar, ChevronRight, MapPin } from "lucide-react";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "info" | "destructive"> = {
  REQUESTED: "secondary",
  SCHEDULED: "info",
  CONFIRMED: "success",
  EN_ROUTE: "warning",
  ON_SITE: "warning",
  INSPECTION_STARTED: "warning",
  INSPECTION_COMPLETE: "success",
  CANCELLED: "destructive",
};

const statusLabel: Record<string, string> = {
  REQUESTED: "Requested",
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  INSPECTION_STARTED: "In Progress",
  INSPECTION_COMPLETE: "Complete",
  CANCELLED: "Cancelled",
};

interface Appointment {
  id: string;
  scheduledDate: Date;
  status: string;
  customer: { firstName: string; lastName: string; companyName?: string | null };
  property: { name: string; city: string; state: string };
  technician?: { firstName: string; lastName: string } | null;
}

export function RecentAppointments({ appointments }: { appointments: Appointment[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Appointments
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/scheduling">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No upcoming appointments</p>
        )}
        {appointments.map((appt) => (
          <Link
            key={appt.id}
            href={`/scheduling/${appt.id}`}
            className="block rounded-lg border p-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {appt.customer.companyName ?? `${appt.customer.firstName} ${appt.customer.lastName}`}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500 truncate">
                    {appt.property.name} · {appt.property.city}, {appt.property.state}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(appt.scheduledDate)}
                </p>
              </div>
              <Badge variant={statusVariant[appt.status] ?? "secondary"} className="flex-shrink-0">
                {statusLabel[appt.status] ?? appt.status}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
