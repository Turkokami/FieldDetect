import { beforeAll, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { describeDb, migrateTestDb, uid } from "./helpers";

const load = async () => ({
  prisma: (await import("@/lib/prisma")).prisma,
  generatePublicToken: (await import("@/lib/estimates")).generatePublicToken,
  GET: (await import("@/app/api/public/estimates/[token]/route")).GET,
  EVENTS: (await import("@/app/api/public/estimates/[token]/events/route")).POST,
  ACCEPT: (await import("@/app/api/public/estimates/[token]/accept/route")).POST,
  DECLINE: (await import("@/app/api/public/estimates/[token]/decline/route")).POST,
});
type L = Awaited<ReturnType<typeof load>>;

describeDb("public estimate API (/e/[token])", () => {
  let m: L;
  let orgId: string, customerId: string;
  const ip = () => `203.0.113.${Math.floor(Math.random() * 250)}`;
  const p = (token: string) => ({ params: Promise.resolve({ token }) });
  const req = (url: string, init: { method?: string; body?: string; contentType?: string; ip?: string } = {}) =>
    new NextRequest(`https://x.test${url}`, {
      method: init.method ?? "GET", body: init.body,
      headers: { "x-forwarded-for": init.ip ?? ip(), "user-agent": "TestBrowser/1.0", "content-type": init.contentType ?? "application/json" },
    });
  const mk = (over: Record<string, unknown> = {}) => m.prisma.estimate.create({ data: {
    organizationId: orgId, customerId, estimateNumber: `EST-T-${uid()}`, publicToken: m.generatePublicToken(), status: "SENT",
    internalNotes: "SECRET", facilityData: { secret: true }, subtotal: 100, totalAmount: 100, validUntil: new Date(Date.now() + 86_400_000),
    lineItems: { create: [{ description: "Thing", unit: "LINEAR_FT", quantity: 10, unitPrice: 10, total: 100, unitCost: 3 }] },
    ...over,
  }});
  const event = (token: string, body: unknown, ipAddr?: string) =>
    m.EVENTS(req(`/api/public/estimates/${token}/events`, { method: "POST", body: JSON.stringify(body), contentType: "text/plain;charset=UTF-8", ip: ipAddr }), p(token));
  const accept = (token: string, body: unknown) => m.ACCEPT(req(`/api/public/estimates/${token}/accept`, { method: "POST", body: JSON.stringify(body) }), p(token));

  beforeAll(async () => {
    migrateTestDb();
    m = await load();
    orgId = (await m.prisma.organization.create({ data: { name: "Brand", slug: `brand-${uid()}` } })).id;
    customerId = (await m.prisma.customer.create({ data: { organizationId: orgId, firstName: "Jane", lastName: "Doe", email: "jane@example.com" } })).id;
  });

  it("first view sets VIEWED; preview doesn't; responses never include internal fields", async () => {
    const e = await mk();
    const preview = await m.GET(req(`/api/public/estimates/${e.publicToken}?preview=1`), p(e.publicToken!));
    expect(preview.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect((await m.prisma.estimate.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("SENT");
    const res = await m.GET(req(`/api/public/estimates/${e.publicToken}`), p(e.publicToken!));
    const body = await res.json();
    expect(body.data.status).toBe("VIEWED");
    expect((await m.prisma.estimate.findUniqueOrThrow({ where: { id: e.id } })).viewedAt).not.toBeNull();
    expect(JSON.stringify(body)).not.toMatch(/SECRET|unitCost|facilityData|internalNotes|jane@example/);
  });

  it("records OPENED per session and SECTION_VIEW dwell (capped at 1800s) from sendBeacon bodies", async () => {
    const e = await mk();
    expect((await event(e.publicToken!, { sessionId: "sessAAAA1111", type: "OPENED" })).status).toBe(204);
    await event(e.publicToken!, { sessionId: "sessAAAA1111", type: "OPENED" });
    await event(e.publicToken!, { sessionId: "sessAAAA1111", type: "SECTION_VIEW", section: 2, seconds: 5000 });
    const events = await m.prisma.estimateEvent.findMany({ where: { estimateId: e.id } });
    expect(events.filter((x) => x.type === "OPENED")).toHaveLength(2);
    expect(events.find((x) => x.type === "SECTION_VIEW")).toMatchObject({ section: 2, seconds: 1800, userAgent: "TestBrowser/1.0" });
    expect((await event(e.publicToken!, { sessionId: "x", type: "NOPE" })).status).toBe(400);
  });

  it("accept saves name, IP and time; second accept is 409", async () => {
    const e = await mk();
    expect((await accept(e.publicToken!, { name: "Jane Doe" })).status).toBe(400);
    const ok = await accept(e.publicToken!, { name: "Jane Doe", title: "Owner", agree: true, signatureDataUrl: "data:image/png;base64,iVBORw0KGgo=" });
    expect(ok.status).toBe(200);
    const saved = await m.prisma.estimate.findUniqueOrThrow({ where: { id: e.id } });
    expect(saved).toMatchObject({ status: "ACCEPTED", acceptedByName: "Jane Doe", acceptedByTitle: "Owner", acceptedUserAgent: "TestBrowser/1.0" });
    expect(saved.acceptedIp).toMatch(/^203\.0\.113\./);
    expect(saved.acceptedAt).not.toBeNull();
    expect(await m.prisma.estimateEvent.count({ where: { estimateId: e.id, type: "ACCEPTED" } })).toBe(1);
    expect((await accept(e.publicToken!, { name: "Jane Doe", agree: true })).status).toBe(409);
  });

  it("expired estimates can't be accepted and are saved as EXPIRED; oversized signatures are rejected", async () => {
    const e = await mk({ validUntil: new Date(Date.now() - 86_400_000) });
    expect((await accept(e.publicToken!, { name: "Jane Doe", agree: true })).status).toBe(410);
    expect((await m.prisma.estimateEvent.count({ where: { estimateId: e.id } }))).toBe(0);
    expect((await m.prisma.estimate.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("EXPIRED");
    const f = await mk();
    const big = "data:image/png;base64," + "A".repeat(210 * 1024);
    expect((await accept(f.publicToken!, { name: "Jane Doe", agree: true, signatureDataUrl: big })).status).toBe(400);
  });

  it("decline records the reason", async () => {
    const e = await mk();
    const res = await m.DECLINE(req(`/api/public/estimates/${e.publicToken}/decline`, { method: "POST", body: JSON.stringify({ reason: "Too expensive" }) }), p(e.publicToken!));
    expect(res.status).toBe(200);
    expect(await m.prisma.estimate.findUniqueOrThrow({ where: { id: e.id } })).toMatchObject({ status: "DECLINED", declineReason: "Too expensive" });
  });

  it("rate limits events per token and IP", async () => {
    const e = await mk();
    const addr = "198.51.100.200";
    let last = 204, n = 0;
    for (; n < 130 && last !== 429; n++) last = (await event(e.publicToken!, { sessionId: "rateRATE0000", type: "SECTION_VIEW", section: 0, seconds: 1 }, addr)).status;
    expect(last).toBe(429);
    expect(n).toBe(121);
  });
});
