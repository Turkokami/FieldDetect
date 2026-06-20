import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
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
    },
  });

  if (!estimate) notFound();

  const serialized = JSON.parse(JSON.stringify(estimate));

  return <EstimateDetailClient estimate={serialized} />;
}
