import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProductUnit, ServiceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rbacResponse } from "@/lib/auth";
import { requireApiKey } from "@/lib/api-key";
import { alertOwners } from "@/lib/owner-alerts";
import { normalizeAddressKey, normalizePhone } from "@/lib/lead-matching";
import { formatCurrency } from "@/lib/utils";
import {
  APP_URL,
  computeEstimateTotals,
  escapeHtml,
  generateEstimateNumber,
  generatePublicToken,
  lineItemTotal,
  sendEstimate,
  withUniqueRetry,
} from "@/lib/estimates";

// POST /api/integrations/leads (API key, scope leads:write)
// Creates or updates customer + property + estimate in one transaction.
// Idempotent on (organization, externalRef).

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const lineItemSchema = z.object({
  sku: optionalText(100),
  description: z.string().trim().min(1).max(500),
  unit: z.enum(ProductUnit).optional().nullable(),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  unitCost: z.coerce.number().min(0).optional().nullable(),
});

const schema = z.object({
  externalRef: z.string().trim().min(1).max(200),
  source: z.string().trim().min(1).max(50),
  serviceType: z.enum(ServiceType).default("OTHER"),
  customer: z
    .object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().max(100).optional().nullable(),
      companyName: optionalText(200),
      email: z.email().max(254).optional().nullable(),
      phone: optionalText(40),
      tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
    })
    .refine((c) => !!c.email || !!c.phone, { message: "customer.email or customer.phone is required" }),
  property: z.object({
    addressLine1: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(2).max(50),
    zip: z.string().trim().min(3).max(20),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    name: optionalText(200),
  }),
  estimate: z.object({
    title: optionalText(200),
    status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
    scopeNotes: optionalText(10_000),
    internalNotes: optionalText(10_000),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
    validUntil: z.iso.datetime({ offset: true }).optional().nullable(),
    facilityData: z.unknown().optional().nullable(),
    lineItems: z.array(lineItemSchema).min(1).max(200),
    presentation: z.unknown().optional().nullable(),
  }),
});

type LeadInput = z.infer<typeof schema>;

const SOURCE_LABELS: Record<string, string> = {
  "roof-estimator": "Roof Estimator",
  "proposal-studio": "Proposal Studio",
  "exclusion-calculator": "Exclusion Calculator",
  manual: "Manual",
};

// ─── Matching helpers ─────────────────────────────────────────────────────────

const blank = (v: string | null | undefined) => v == null || v.trim() === "";

type Tx = Prisma.TransactionClient;

async function upsertCustomer(tx: Tx, organizationId: string, c: LeadInput["customer"]) {
  const phone = normalizePhone(c.phone);
  const email = c.email?.trim() || null;

  let customer = email
    ? await tx.customer.findFirst({
        where: { organizationId, email: { equals: email, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
      })
    : null;

  if (!customer && phone) {
    const last10 = phone.replace(/\D/g, "").slice(-10);
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM customers
      WHERE "organizationId" = ${organizationId}
        AND phone IS NOT NULL
        AND right(regexp_replace(phone, '\\D', '', 'g'), 10) = ${last10}
      ORDER BY "createdAt" ASC
      LIMIT 1`;
    if (rows[0]) customer = await tx.customer.findUnique({ where: { id: rows[0].id } });
  }

  if (!customer) {
    return tx.customer.create({
      data: {
        organizationId,
        firstName: c.firstName,
        lastName: c.lastName ?? "",
        companyName: c.companyName || null,
        email,
        phone,
        tags: [...new Set(c.tags)],
        customerType: c.companyName ? "COMMERCIAL" : "RESIDENTIAL",
        referralSource: null,
      },
    });
  }

  // Fill blanks only; never overwrite what the office already has. Merge tags.
  const updates: Prisma.CustomerUpdateInput = {};
  if (blank(customer.firstName)) updates.firstName = c.firstName;
  if (blank(customer.lastName) && c.lastName) updates.lastName = c.lastName;
  if (blank(customer.companyName) && c.companyName) updates.companyName = c.companyName;
  if (blank(customer.email) && email) updates.email = email;
  if (blank(customer.phone) && phone) updates.phone = phone;
  const tags = [...new Set([...customer.tags, ...c.tags])];
  if (tags.length !== customer.tags.length) updates.tags = tags;

  return Object.keys(updates).length
    ? tx.customer.update({ where: { id: customer.id }, data: updates })
    : customer;
}

async function upsertProperty(tx: Tx, organizationId: string, customerId: string, p: LeadInput["property"]) {
  const key = normalizeAddressKey(p.addressLine1, p.zip);
  const existing = (
    await tx.property.findMany({ where: { organizationId, customerId }, orderBy: { createdAt: "asc" } })
  ).find((prop) => normalizeAddressKey(prop.addressLine1, prop.zip) === key);

  if (!existing) {
    return tx.property.create({
      data: {
        organizationId,
        customerId,
        name: p.name || `${p.addressLine1}, ${p.city}`,
        addressLine1: p.addressLine1,
        city: p.city,
        state: p.state,
        zip: p.zip,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
      },
    });
  }

  if (existing.latitude == null && existing.longitude == null && p.latitude != null && p.longitude != null) {
    return tx.property.update({
      where: { id: existing.id },
      data: { latitude: p.latitude, longitude: p.longitude },
    });
  }
  return existing;
}

const json = (v: unknown) =>
  v === undefined ? undefined : v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { organization, apiKey } = await requireApiKey(req, "leads:write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
    }
    const data = schema.parse(body);
    const orgId = organization.id;

    const result = await withUniqueRetry(() =>
      prisma.$transaction(async (tx) => {
        const customer = await upsertCustomer(tx, orgId, data.customer);
        const property = await upsertProperty(tx, orgId, customer.id, data.property);

        // Link line items to active products by sku. The caller's price and
        // description still win: that's what the customer was quoted.
        const skus = [...new Set(data.estimate.lineItems.map((li) => li.sku).filter((s): s is string => !!s))];
        const products = skus.length
          ? await tx.product.findMany({
              where: { organizationId: orgId, sku: { in: skus }, isActive: true },
              select: { id: true, sku: true, unit: true },
            })
          : [];
        const bySku = new Map(products.map((p) => [p.sku, p]));

        const lineItems = data.estimate.lineItems.map((li, i) => {
          const product = li.sku ? bySku.get(li.sku) : undefined;
          return {
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: lineItemTotal(li),
            sortOrder: i,
            unit: li.unit ?? product?.unit ?? null,
            productId: product?.id ?? null,
            unitCost: li.unitCost ?? null,
          };
        });

        const totals = computeEstimateTotals(lineItems, data.estimate.taxRate, data.estimate.discountAmount);
        const fields = {
          customerId: customer.id,
          propertyId: property.id,
          title: data.estimate.title ?? null,
          serviceType: data.serviceType,
          scopeNotes: data.estimate.scopeNotes ?? null,
          internalNotes: data.estimate.internalNotes ?? null,
          taxRate: data.estimate.taxRate,
          discountAmount: data.estimate.discountAmount,
          ...totals,
          validUntil: data.estimate.validUntil ? new Date(data.estimate.validUntil) : null,
          facilityData: json(data.estimate.facilityData),
          presentation: json(data.estimate.presentation),
          source: data.source,
        };

        const existing = await tx.estimate.findUnique({
          where: { organizationId_externalRef: { organizationId: orgId, externalRef: data.externalRef } },
        });

        if (existing) {
          if (existing.status === "ACCEPTED" || existing.status === "CONVERTED") {
            throw new Error("AlreadyAccepted");
          }
          await tx.estimateLineItem.deleteMany({ where: { estimateId: existing.id } });
          const estimate = await tx.estimate.update({
            where: { id: existing.id },
            data: {
              ...fields,
              ...(existing.publicToken ? {} : { publicToken: generatePublicToken() }),
              lineItems: { create: lineItems },
            },
          });
          return { customer, property, estimate, created: false };
        }

        const estimate = await tx.estimate.create({
          data: {
            organizationId: orgId,
            estimateNumber: generateEstimateNumber(),
            publicToken: generatePublicToken(),
            externalRef: data.externalRef,
            status: "DRAFT",
            ...fields,
            lineItems: { create: lineItems },
          },
        });
        return { customer, property, estimate, created: true };
      })
    );

    let { estimate } = result;
    const { customer, property, created } = result;
    const warnings: string[] = [];

    // Send only on the first transition to SENT, so retries don't re-email.
    if (data.estimate.status === "SENT" && !estimate.sentAt) {
      try {
        estimate = await sendEstimate(estimate.id, organization);
      } catch (err) {
        if (err instanceof Error && err.message === "NoCustomerEmail") {
          warnings.push("Not sent: the customer has no email address. Saved as a draft.");
        } else {
          console.error("[INTEGRATION_LEADS] send failed", err);
          warnings.push("Saved, but the email to the customer failed. Send it from the dashboard.");
        }
      }
    }

    const sourceLabel = SOURCE_LABELS[data.source] ?? data.source;
    const customerName = `${customer.firstName} ${customer.lastName}`.trim();
    const total = formatCurrency(estimate.totalAmount);

    if (created) {
      await alertOwners(orgId, {
        subject: `New estimate from ${sourceLabel} — ${customerName} · ${total}`,
        sms: `New ${sourceLabel} estimate ${estimate.estimateNumber}: ${customerName} · ${total}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
          <h2 style="font-size:19px;margin:0 0 12px">New estimate from ${escapeHtml(sourceLabel)}</h2>
          <p style="margin:0 0 8px"><strong>${escapeHtml(customerName)}</strong>${customer.companyName ? ` · ${escapeHtml(customer.companyName)}` : ""}</p>
          <p style="margin:0 0 8px;color:#6b7280">${escapeHtml([customer.email, customer.phone].filter(Boolean).join(" · "))}</p>
          <p style="margin:0 0 8px;color:#6b7280">📍 ${escapeHtml(`${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`)}</p>
          <p style="margin:0 0 16px">${escapeHtml(estimate.title ?? estimate.estimateNumber)} · <strong>${total}</strong>${estimate.status === "SENT" ? " · sent to customer" : " · draft"}</p>
          <a href="${APP_URL}/estimates/${estimate.id}" style="display:inline-block;background:#0ABAB5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Open estimate →</a>
        </div>`,
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        action: "integration.lead.upsert",
        entityType: "Estimate",
        entityId: estimate.id,
        newValues: {
          created,
          externalRef: data.externalRef,
          source: data.source,
          apiKeyId: apiKey.id,
          apiKeyName: apiKey.name,
          customerId: customer.id,
          propertyId: property.id,
          totalAmount: estimate.totalAmount,
          status: estimate.status,
        },
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json(
      {
        data: {
          customerId: customer.id,
          propertyId: property.id,
          estimateId: estimate.id,
          estimateNumber: estimate.estimateNumber,
          status: estimate.status,
          publicUrl: `${APP_URL}/e/${estimate.publicToken}`,
          created,
          ...(warnings.length ? { warnings } : {}),
        },
      },
      { status: created ? 201 : 200 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "AlreadyAccepted") {
      return NextResponse.json(
        { error: "This estimate was already accepted and can't be changed. Use a new externalRef for a new quote." },
        { status: 409 }
      );
    }
    const r = rbacResponse(err);
    if (r) return r;
    console.error("[INTEGRATION_LEADS]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
