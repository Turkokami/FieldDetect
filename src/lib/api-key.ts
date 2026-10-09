import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import type { ApiKey, Organization } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Machine-to-machine auth for /api/integrations/*.
// Header: Authorization: Bearer fd_live_<43 random base64url chars>
// Only the sha256 of the key is stored; the plaintext is shown once at creation.

export const API_KEY_SCOPES = ["leads:write", "products:read"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const KEY_PREFIX = "fd_live_";
const DISPLAY_PREFIX_LENGTH = 12;
const RATE_LIMIT_PER_MINUTE = 60;

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { key, prefix: key.slice(0, DISPLAY_PREFIX_LENGTH), keyHash: hashApiKey(key) };
}

/**
 * Authenticates the request's API key and checks it has `scope`.
 * Throws Error("Unauthorized" | "Forbidden" | "RateLimited"); rbacResponse()
 * maps these to 401 / 403 / 429.
 */
export async function requireApiKey(
  req: NextRequest,
  scope: ApiKeyScope
): Promise<{ organization: Organization; apiKey: ApiKey }> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(fd_live_[A-Za-z0-9_-]{32,})$/.exec(header.trim());
  if (!match) throw new Error("Unauthorized");

  const keyHash = hashApiKey(match[1]);
  const record = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { organization: true },
  });

  if (
    !record ||
    record.revokedAt ||
    !timingSafeEqual(Buffer.from(record.keyHash, "hex"), Buffer.from(keyHash, "hex"))
  ) {
    throw new Error("Unauthorized");
  }

  if (!record.scopes.includes(scope)) throw new Error("Forbidden");

  if (!(await rateLimit(`apikey:${record.id}`, RATE_LIMIT_PER_MINUTE, 60))) {
    throw new Error("RateLimited");
  }

  // Not awaited: a slow write shouldn't delay the integration call.
  prisma.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch((err) => console.error("[API_KEY] lastUsedAt update failed", err));

  const { organization, ...apiKey } = record;
  return { organization, apiKey };
}
