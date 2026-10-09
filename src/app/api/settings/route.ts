import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { catalogSetsForModules, seedCatalog } from "@/lib/products";

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  googleReviewUrl: z.string().url().optional().nullable().or(z.literal("")),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  reportFooter: z.string().optional().nullable(),
  invoiceNotes: z.string().optional().nullable(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
  timezone: z.string().optional(),
  ccEmails: z.array(z.string().email()).optional(),
  contractTemplate: z.string().optional().nullable(),
  enabledModules: z.array(z.string()).optional(),
  estimateOpenAlerts: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({ data: org });
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { estimateOpenAlerts, ...validated } = updateSettingsSchema.parse(body);

    // Toggles stored in the org's settings JSON
    let settings: Record<string, unknown> | undefined;
    if (estimateOpenAlerts !== undefined) {
      const current = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { settings: true } });
      const base = current?.settings && typeof current.settings === "object" && !Array.isArray(current.settings)
        ? (current.settings as Record<string, unknown>)
        : {};
      settings = { ...base, estimateOpenAlerts };
    }

    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        ...validated,
        website: validated.website || null,
        email: validated.email || null,
        googleReviewUrl: validated.googleReviewUrl || null,
        ...(settings ? { settings: settings as Prisma.InputJsonValue } : {}),
      },
    });

    // Turning on a module with a default price list adds any missing products.
    if (validated.enabledModules) {
      for (const set of catalogSetsForModules(validated.enabledModules)) {
        await seedCatalog(org.id, set).catch((err) => console.error("[SETTINGS_PATCH] seed", err));
      }
    }

    return NextResponse.json({ data: org });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
