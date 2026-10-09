import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission, rbacResponse } from "@/lib/auth";
import { API_KEY_SCOPES, generateApiKey } from "@/lib/api-key";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1).optional(),
});

// Never select keyHash: it's only for lookups.
const publicFields = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export async function GET() {
  try {
    const ctx = await requirePermission("api_keys:manage");
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: ctx.organization.id },
      select: publicFields,
      orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    });
    return NextResponse.json({ data: keys });
  } catch (error) {
    const r = rbacResponse(error);
    if (r) return r;
    console.error("[API_KEYS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("api_keys:manage");
    const { name, scopes } = createSchema.parse(await req.json());
    const { key, prefix, keyHash } = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: ctx.organization.id,
        name,
        prefix,
        keyHash,
        ...(scopes ? { scopes } : {}),
        createdById: ctx.user.id,
      },
      select: publicFields,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organization.id,
        userId: ctx.user.id,
        action: "api_key.create",
        entityType: "ApiKey",
        entityId: apiKey.id,
        newValues: { name: apiKey.name, prefix: apiKey.prefix, scopes: apiKey.scopes },
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });

    // The full key is returned exactly once; only its hash is stored.
    return NextResponse.json({ data: { ...apiKey, key } }, { status: 201 });
  } catch (error) {
    const r = rbacResponse(error);
    if (r) return r;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("[API_KEYS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
