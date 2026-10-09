import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generatePublicToken, APP_URL } from "@/lib/estimates";
import { sectionNames, summarizeActivity } from "@/lib/estimate-activity";
import EstimateDetailClient from "./estimate-detail-client";

export const metadata = { title: "Estimate" };

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user) redirect("/onboarding");

  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true } },
      property: { select: { id: true, name: true, addressLine1: true, city: true, state: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!estimate) notFound();

  // Estimates created before the public page existed get their link token lazily.
  if (!estimate.publicToken) {
    estimate.publicToken = generatePublicToken();
    await prisma.estimate.update({ where: { id: estimate.id }, data: { publicToken: estimate.publicToken } });
  }

  const { events, ...rest } = estimate;
  const activity = summarizeActivity(events, sectionNames(estimate.presentation));
  const serialized = JSON.parse(JSON.stringify(rest));

  return (
    <EstimateDetailClient
      estimate={serialized}
      activity={JSON.parse(JSON.stringify(activity))}
      publicUrl={`${APP_URL}/e/${estimate.publicToken}`}
    />
  );
}
