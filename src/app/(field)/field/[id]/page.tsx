import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import FieldTechView from "@/components/field/field-tech-view";
import type { TechAppointment } from "@/components/field/field-tech-view";

export default async function FieldJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) return null;

  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: true,
      property: {
        include: {
          buildings: {
            include: {
              units: { orderBy: [{ floor: "asc" }, { unitNumber: "asc" }] },
            },
            orderBy: { name: "asc" },
          },
          units: {
            where: { buildingId: null },
            orderBy: [{ floor: "asc" }, { unitNumber: "asc" }],
          },
        },
      },
      technician: { select: { firstName: true, lastName: true } },
      k9Team: {
        include: {
          dogs: { where: { isActive: true }, take: 1 },
          members: {
            where: { isPrimary: true },
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      inspection: {
        select: {
          id: true,
          summaryNotes: true,
          inspectionUnits: {
            include: { photos: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!appointment) notFound();

  const MAP_SERVICE_TYPES = [
    "GOOSE_CONTROL", "RODENT_INSPECTION", "RODENT_EXCLUSION",
    "WILDLIFE_INSPECTION", "WILDLIFE_REMOVAL", "BIRD_EXCLUSION",
  ];

  const propertyMaps = MAP_SERVICE_TYPES.includes(appointment.serviceType)
    ? await prisma.propertyMap.findMany({
        where: { propertyId: appointment.propertyId, organizationId: user.organizationId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const apt: TechAppointment = {
    ...JSON.parse(JSON.stringify(appointment)),
    propertyMaps: JSON.parse(JSON.stringify(propertyMaps)),
  };
  return <FieldTechView appointment={apt} />;
}
