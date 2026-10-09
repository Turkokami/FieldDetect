import Redis from "ioredis";

// Fixed-window rate limiter. Uses Redis when REDIS_URL is set so limits hold
// across serverless instances; otherwise falls back to per-instance memory.

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  redis = url ? new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true }) : null;
  return redis;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, windowMs: number): number {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/** Records one hit for `key`; returns true while the caller is within `limit` per window. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const client = getRedis();
  if (client) {
    try {
      const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
      const count = await client.incr(bucket);
      if (count === 1) await client.expire(bucket, windowSeconds);
      return count <= limit;
    } catch (err) {
      console.error("[RATE_LIMIT] redis unavailable, using memory", err);
    }
  }
  return memoryHit(key, windowSeconds * 1000) <= limit;
}
