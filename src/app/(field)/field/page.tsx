import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FieldHome from "./field-home-client";

export const metadata = { title: "My Jobs" };

export default async function FieldHomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth())); // 0-indexed

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  // Extend range so upcoming jobs in the next 60 days are always visible
  const endOfRange = new Date(
    Math.max(
      endOfMonth.getTime(),
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60, 23, 59, 59).getTime()
    )
  );

  // Get all jobs for this tech in the selected month + upcoming 60 days
  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      technicianId: user.id,
      scheduledDate: { gte: startOfMonth, lte: endOfRange },
      status: { not: "CANCELLED" },
    },
    include: {
      customer: { select: { firstName: true, lastName: true, companyName: true, phone: true } },
      property: { select: { id: true, name: true, addressLine1: true, city: true, state: true, zip: true } },
      inspection: { select: { id: true, overallResult: true, totalPositive: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <FieldHome
      appointments={JSON.parse(JSON.stringify(appointments))}
      techName={`${user.firstName} ${user.lastName}`}
      currentYear={year}
      currentMonth={month}
    />
  );
}
