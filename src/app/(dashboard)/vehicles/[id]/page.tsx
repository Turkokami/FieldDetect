import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VehicleProfileClient } from "@/components/vehicles/vehicle-profile-client";

export const metadata = { title: "Vehicle" };

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const { id } = await params;

  const [vehicle, staffUsers, k9Teams] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { id, organizationId: user.organizationId, isActive: true },
      include: {
        maintenance: { orderBy: { performedAt: "desc" } },
        mileageLogs: {
          orderBy: { date: "desc" },
          take: 50,
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            appointment: {
              select: {
                id: true,
                scheduledDate: true,
                customer: { select: { firstName: true, lastName: true, companyName: true } },
                property: { select: { name: true, city: true, state: true } },
              },
            },
          },
        },
        appointments: {
          orderBy: { scheduledDate: "desc" },
          take: 20,
          include: {
            customer: { select: { firstName: true, lastName: true, companyName: true } },
            property: { select: { name: true, city: true, state: true } },
            technician: { select: { firstName: true, lastName: true } },
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
            k9Team: { select: { id: true, name: true, dogs: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { appointments: true, mileageLogs: true } },
      },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    }),
    prisma.k9Team.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, dogs: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!vehicle) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <VehicleProfileClient
      vehicle={JSON.parse(JSON.stringify(vehicle))}
      staffUsers={JSON.parse(JSON.stringify(staffUsers))}
      k9Teams={JSON.parse(JSON.stringify(k9Teams))}
      canEdit={canEdit}
    />
  );
}
