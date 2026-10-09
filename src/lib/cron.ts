import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Cron routes are reachable without sign-in, so each one must check the secret.
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; `x-cron-secret` is
 * accepted for external schedulers. Fails closed when CRON_SECRET is unset.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const bearer = req.headers.get("authorization");
  const provided = bearer?.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : req.headers.get("x-cron-secret");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
