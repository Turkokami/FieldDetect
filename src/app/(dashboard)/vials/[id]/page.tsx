import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { VialDetailClient } from "@/components/vials/vial-detail-client";

export const metadata = { title: "Vial Detail" };

export default async function VialPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) notFound();

  const { id } = await params;

  const vial = await prisma.bedBugVial.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      feedingLogs: { orderBy: { fedAt: "desc" } },
      _count: { select: { feedingLogs: true } },
    },
  });

  if (!vial) notFound();

  const canEdit = ["OWNER", "ADMIN"].includes(user.role);

  return (
    <VialDetailClient
      vial={{
        ...vial,
        acquisitionDate: vial.acquisitionDate.toISOString(),
        createdAt: vial.createdAt.toISOString(),
        updatedAt: vial.updatedAt.toISOString(),
        feedingLogs: vial.feedingLogs.map((f) => ({
          ...f,
          fedAt: f.fedAt.toISOString(),
          createdAt: f.createdAt.toISOString(),
        })),
      }}
      canEdit={canEdit}
    />
  );
}
