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

  const vehicle = await prisma.vehicle.findFirst({
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
      _count: { select: { appointments: true, mileageLogs: true } },
    },
  });

  if (!vehicle) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <VehicleProfileClient
      vehicle={JSON.parse(JSON.stringify(vehicle))}
      canEdit={canEdit}
    />
  );
}
