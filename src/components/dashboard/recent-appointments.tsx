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
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: "rgba(10,186,181,0.12)" }}>
            <Calendar className="h-3.5 w-3.5" style={{ color: "#0ABAB5" }} />
          </span>
          Upcoming Appointments
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" asChild>
          <Link href="/scheduling">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-2">
        {appointments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
        )}
        {appointments.map((appt) => (
          <Link
            key={appt.id}
            href={`/scheduling/${appt.id}`}
            className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/40 transition-all duration-150"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {appt.customer.companyName ?? `${appt.customer.firstName} ${appt.customer.lastName}`}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {appt.property.name} · {appt.property.city}, {appt.property.state}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateTime(appt.scheduledDate)}
              </p>
            </div>
            <Badge variant={statusVariant[appt.status] ?? "secondary"} className="flex-shrink-0 mt-0.5">
              {statusLabel[appt.status] ?? appt.status}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
