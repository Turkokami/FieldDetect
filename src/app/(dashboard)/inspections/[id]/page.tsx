import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InspectionDetail } from "@/components/inspections/inspection-detail";

export const metadata = { title: "Inspection" };

export default async function InspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;
  const inspection = await prisma.inspection.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      appointment: true,
      property: {
        include: {
          customer: { include: { contacts: true } },
          buildings: true,
        },
      },
      technician: true,
      k9Team: {
        include: { members: { include: { user: true } }, dogs: true },
      },
      k9Dog: true,
      inspectionUnits: {
        include: { photos: true, unit: true },
        orderBy: { sortOrder: "asc" },
      },
      photos: { orderBy: { sortOrder: "asc" } },
      invoice: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
    },
  });

  if (!inspection) notFound();

  return (
    <InspectionDetail
      inspection={JSON.parse(JSON.stringify(inspection))}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  );
}
