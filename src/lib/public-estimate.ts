import type { NextRequest } from "next/server";
import type { EstimateStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Shared by the public estimate API routes (/api/public/estimates/[token]/*).
// Everything here is reachable without sign-in: the token is the only key.

export const publicEstimateInclude = {
  organization: {
    select: {
      id: true, name: true, logoUrl: true, brandColor: true, secondaryColor: true,
      phone: true, email: true, website: true, settings: true,
    },
  },
  customer: { select: { firstName: true, lastName: true, companyName: true, email: true } },
  property: { select: { addressLine1: true, addressLine2: true, city: true, state: true, zip: true } },
  lineItems: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.EstimateInclude;

export type PublicEstimateRecord = Prisma.EstimateGetPayload<{ include: typeof publicEstimateInclude }>;

/** Statuses a customer can still accept or decline from. */
export const OPEN_STATUSES: EstimateStatus[] = ["DRAFT", "SENT", "VIEWED"];

export async function findByToken(token: string): Promise<PublicEstimateRecord | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  return prisma.estimate.findUnique({ where: { publicToken: token }, include: publicEstimateInclude });
}

/** Marks an open estimate EXPIRED once validUntil has passed. Returns the current status. */
export async function applyExpiry(estimate: PublicEstimateRecord): Promise<EstimateStatus> {
  if (
    estimate.validUntil &&
    estimate.validUntil.getTime() < Date.now() &&
    OPEN_STATUSES.includes(estimate.status)
  ) {
    await prisma.estimate.updateMany({
      where: { id: estimate.id, status: { in: OPEN_STATUSES } },
      data: { status: "EXPIRED" },
    });
    estimate.status = "EXPIRED";
  }
  return estimate.status;
}

/**
 * The customer-facing view. Never includes internalNotes, unitCost,
 * facilityData, margins, or the customer's contact details.
 */
export function toPublicEstimate(e: PublicEstimateRecord) {
  const customerName =
    e.customer.companyName || `${e.customer.firstName} ${e.customer.lastName}`.trim();
  return {
    organization: {
      name: e.organization.name,
      logoUrl: e.organization.logoUrl,
      brandColor: e.organization.brandColor,
      secondaryColor: e.organization.secondaryColor,
      phone: e.organization.phone,
      email: e.organization.email,
      website: e.organization.website,
    },
    customerName,
    property: e.property
      ? {
          addressLine1: e.property.addressLine1,
          addressLine2: e.property.addressLine2,
          city: e.property.city,
          state: e.property.state,
          zip: e.property.zip,
        }
      : null,
    estimateNumber: e.estimateNumber,
    title: e.title,
    scopeNotes: e.scopeNotes,
    presentation: e.presentation,
    lineItems: e.lineItems.map((li) => ({
      description: li.description,
      unit: li.unit,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
    })),
    subtotal: e.subtotal,
    taxRate: e.taxRate,
    taxAmount: e.taxAmount,
    discountAmount: e.discountAmount,
    totalAmount: e.totalAmount,
    validUntil: e.validUntil,
    status: e.status,
    canRespond: e.status === "SENT" || e.status === "VIEWED",
    acceptedAt: e.status === "ACCEPTED" || e.status === "CONVERTED" ? e.acceptedAt : null,
    acceptedByName: e.status === "ACCEPTED" || e.status === "CONVERTED" ? e.acceptedByName : null,
    declinedAt: e.status === "DECLINED" ? e.declinedAt : null,
  };
}

export function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

export function customerDisplayName(e: Pick<PublicEstimateRecord, "customer">) {
  return `${e.customer.firstName} ${e.customer.lastName}`.trim() || e.customer.companyName || "A customer";
}

/** Per-org switch for "customer opened the estimate" alerts (default on). */
export function openAlertsEnabled(settings: Prisma.JsonValue): boolean {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return (settings as Record<string, unknown>).estimateOpenAlerts !== false;
  }
  return true;
}
