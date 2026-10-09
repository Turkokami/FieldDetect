import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

const req = (headers: Record<string, string>) => new NextRequest("https://x.test/api/cron/reviews", { headers });

describe("isAuthorizedCron", () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = saved; });

  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCron(req({}))).toBe(false);
    expect(isAuthorizedCron(req({ authorization: "Bearer undefined" }))).toBe(false);
  });
  it("accepts the Vercel bearer header or x-cron-secret", () => {
    process.env.CRON_SECRET = "s3cret";
    expect(isAuthorizedCron(req({ authorization: "Bearer s3cret" }))).toBe(true);
    expect(isAuthorizedCron(req({ "x-cron-secret": "s3cret" }))).toBe(true);
    expect(isAuthorizedCron(req({ authorization: "Bearer nope" }))).toBe(false);
    expect(isAuthorizedCron(req({}))).toBe(false);
  });
});

describe("generateApiKey", () => {
  it("returns fd_live_ keys, a 12-char display prefix and a sha256 hash", () => {
    const { key, prefix, keyHash } = generateApiKey();
    expect(key).toMatch(/^fd_live_[A-Za-z0-9_-]{43}$/);
    expect(prefix).toBe(key.slice(0, 12));
    expect(keyHash).toBe(hashApiKey(key));
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(keyHash).not.toContain(key);
  });
});
