import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SchedulingCalendar } from "@/components/scheduling/scheduling-calendar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import BookingRequests from "@/components/scheduling/booking-requests";

export const metadata = { title: "Scheduling" };

export default async function SchedulingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59);

  const [appointments, bookingRequests, ppeRequirements] = await Promise.all([
  prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      scheduledDate: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      property: { select: { name: true, addressLine1: true, city: true, state: true, propertyType: true } },
      technician: { select: { id: true, firstName: true, lastName: true } },
      k9Team: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  }),
  prisma.appointment.findMany({
    where: { organizationId: user.organizationId, status: "REQUESTED" },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
      property: { select: { name: true, addressLine1: true, city: true, state: true } },
    },
    orderBy: { scheduledDate: "asc" },
  }),
  prisma.facilityPPERequirement.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: [{ facilityType: "asc" }, { sortOrder: "asc" }],
  }),
  ]);

  const technicians = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] },
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduling</h1>
          <p className="text-slate-500 text-sm mt-1">Manage appointments and routes</p>
        </div>
        <Button asChild>
          <Link href="/scheduling/new">
            <Plus className="h-4 w-4" />
            Schedule Job
          </Link>
        </Button>
      </div>

      {bookingRequests.length > 0 && (
        <BookingRequests requests={JSON.parse(JSON.stringify(bookingRequests))} />
      )}

      <SchedulingCalendar
        initialAppointments={JSON.parse(JSON.stringify(appointments))}
        technicians={JSON.parse(JSON.stringify(technicians))}
        ppeRequirements={JSON.parse(JSON.stringify(ppeRequirements))}
      />
    </div>
  );
}
