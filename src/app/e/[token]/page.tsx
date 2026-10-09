import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PublicEstimateView } from "./public-estimate-view";

// Public, token-scoped estimate page. Branded as the organization only.

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const estimate = /^[A-Za-z0-9_-]{20,100}$/.test(token)
    ? await prisma.estimate.findUnique({
        where: { publicToken: token },
        select: { estimateNumber: true, organization: { select: { name: true } } },
      })
    : null;
  return {
    title: { absolute: estimate ? `Estimate ${estimate.estimateNumber} · ${estimate.organization.name}` : "Estimate" },
    description: estimate ? `Your estimate from ${estimate.organization.name}` : undefined,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PublicEstimatePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { preview } = await searchParams;
  return <PublicEstimateView token={token} preview={preview === "1"} />;
}
