import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditAppointmentForm from "./edit-appointment-form";

export const metadata = { title: "Edit Appointment" };

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const [appointment, technicians, k9Teams] = await Promise.all([
    prisma.appointment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        property: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true, role: { in: ["TECHNICIAN", "ADMIN", "OWNER"] } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }],
    }),
    prisma.k9Team.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!appointment) notFound();

  return (
    <EditAppointmentForm
      appointment={JSON.parse(JSON.stringify(appointment))}
      technicians={technicians}
      k9Teams={k9Teams}
    />
  );
}
