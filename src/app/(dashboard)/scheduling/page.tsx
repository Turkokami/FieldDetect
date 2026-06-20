import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SchedulingCalendar } from "@/components/scheduling/scheduling-calendar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Scheduling" };

export default async function SchedulingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      scheduledDate: { gte: startOfWeek, lte: endOfWeek },
    },
    include: {
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      property: { select: { name: true, addressLine1: true, city: true, state: true } },
      technician: { select: { id: true, firstName: true, lastName: true } },
      k9Team: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

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

      <SchedulingCalendar
        initialAppointments={JSON.parse(JSON.stringify(appointments))}
        technicians={JSON.parse(JSON.stringify(technicians))}
      />
    </div>
  );
}
