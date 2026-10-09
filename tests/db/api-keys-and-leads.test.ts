import { beforeAll, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { describeDb, migrateTestDb, uid } from "./helpers";

// Imported lazily so DATABASE_URL is set first (tests/setup.ts).
const load = async () => ({
  prisma: (await import("@/lib/prisma")).prisma,
  ...(await import("@/lib/api-key")),
  ...(await import("@/lib/estimates")),
  rbacResponse: (await import("@/lib/auth")).rbacResponse,
  leads: (await import("@/app/api/integrations/leads/route")).POST,
  products: (await import("@/app/api/integrations/products/route")).GET,
});
type L = Awaited<ReturnType<typeof load>>;

describeDb("API keys + /api/integrations", () => {
  let m: L;
  let orgA: string, orgB: string, keyA: string, keyB: string, keyLeadsOnly: string, keyProductsOnly: string;

  const post = async (key: string, body: unknown) => {
    const res = await m.leads(new NextRequest("https://x.test/api/integrations/leads", {
      method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    return { status: res.status, body: await res.json() };
  };
  const getProducts = async (key: string, q = "") => {
    const res = await m.products(new NextRequest(`https://x.test/api/integrations/products${q}`, { headers: { authorization: `Bearer ${key}` } }));
    return { status: res.status, body: await res.json() };
  };
  const lights = [
    { sku: "c9-roofline", description: "C9 LED roofline", unit: "LINEAR_FT", quantity: 486, unitPrice: 9.1, unitCost: 2.5 },
    { sku: "timer", description: "Timer / controller", unit: "EACH", quantity: 1, unitPrice: 45 },
    { description: "Takedown & storage", unit: "FLAT", quantity: 1, unitPrice: 150 },
  ];
  const lead = (over: Record<string, unknown> = {}) => ({
    externalRef: `roofest_${uid()}`, source: "roof-estimator", serviceType: "HOLIDAY_LIGHTING",
    customer: { firstName: "Jane", lastName: "Doe", email: `jane-${uid()}@example.com`, phone: "+13605550100", tags: ["roof-estimator"] },
    property: { addressLine1: "123 Main Street", city: "Bellingham", state: "WA", zip: "98225", latitude: 48.75, longitude: -122.48 },
    estimate: { title: "Holiday Lighting Install", status: "DRAFT", internalNotes: "Est. cost $1,440 · 71% margin", taxRate: 8.7,
                facilityData: { kind: "lights", rooflineFt: 486 }, lineItems: lights },
    ...over,
  });

  beforeAll(async () => {
    migrateTestDb();
    m = await load();
    const mkKey = async (organizationId: string, scopes?: string[]) => {
      const k = m.generateApiKey();
      await m.prisma.apiKey.create({ data: { organizationId, name: "test", prefix: k.prefix, keyHash: k.keyHash, ...(scopes ? { scopes } : {}) } });
      return k.key;
    };
    orgA = (await m.prisma.organization.create({ data: { name: "Org A", slug: `a-${uid()}` } })).id;
    orgB = (await m.prisma.organization.create({ data: { name: "Org B", slug: `b-${uid()}` } })).id;
    keyA = await mkKey(orgA); keyB = await mkKey(orgB);
    keyLeadsOnly = await mkKey(orgA, ["leads:write"]); keyProductsOnly = await mkKey(orgA, ["products:read"]);
    await m.prisma.product.createMany({ data: [
      { organizationId: orgA, sku: "c9-roofline", name: "C9", category: "Holiday Lighting", unit: "LINEAR_FT", unitPrice: 9, unitCost: 2.5, sortOrder: 1 },
      { organizationId: orgA, sku: "timer", name: "Timer", category: "Holiday Lighting", unit: "EACH", unitPrice: 45, sortOrder: 2 },
      { organizationId: orgA, sku: "old", name: "Old", category: "Holiday Lighting", unit: "EACH", unitPrice: 1, isActive: false },
      { organizationId: orgB, sku: "b-only", name: "B", category: "Holiday Lighting", unit: "EACH", unitPrice: 5 },
    ]});
  });

  it("stores only the key's hash; revoked keys get 401; missing scope gets 403", async () => {
    const row = await m.prisma.apiKey.findFirstOrThrow({ where: { organizationId: orgA, scopes: { has: "leads:write" } } });
    expect(JSON.stringify(row)).not.toContain(keyA);
    expect((await post(keyProductsOnly, lead())).status).toBe(403);
    expect((await getProducts(keyLeadsOnly)).status).toBe(403);
    const k = m.generateApiKey();
    await m.prisma.apiKey.create({ data: { organizationId: orgA, name: "revoked", prefix: k.prefix, keyHash: k.keyHash, revokedAt: new Date() } });
    expect((await post(k.key, lead())).status).toBe(401);
    expect((await post("fd_live_" + "x".repeat(43), lead())).status).toBe(401);
  });

  it("new email creates customer, property and estimate with shared totals, units and lat/lng", async () => {
    const r = await post(keyA, lead());
    expect(r.status).toBe(201);
    const est = await m.prisma.estimate.findUniqueOrThrow({ where: { id: r.body.data.estimateId }, include: { lineItems: { orderBy: { sortOrder: "asc" } }, property: true } });
    const t = m.computeEstimateTotals(lights, 8.7, 0);
    expect(est.subtotal).toBeCloseTo(t.subtotal, 9);
    expect(est.totalAmount).toBeCloseTo(t.totalAmount, 9);
    expect(est.property).toMatchObject({ latitude: 48.75, longitude: -122.48 });
    expect(est.lineItems[0]).toMatchObject({ unit: "LINEAR_FT", unitPrice: 9.1, unitCost: 2.5 });
    expect(est.lineItems[0].productId).not.toBeNull();
    expect(est.lineItems[2].productId).toBeNull();
    expect(r.body.data.publicUrl).toMatch(new RegExp(`/e/${est.publicToken}$`));
    expect(JSON.stringify(r.body)).not.toMatch(/unitCost|internalNotes|facilityData|margin/);
  });

  it("same email + new address → second property on the same customer; same address spelled differently → same property", async () => {
    const email = `same-${uid()}@example.com`;
    const a = await post(keyA, lead({ customer: { firstName: "Sam", email } }));
    const b = await post(keyA, lead({ customer: { firstName: "S", email: email.toUpperCase() }, property: { addressLine1: "9 Oak Ave", city: "Ferndale", state: "WA", zip: "98248" } }));
    const c = await post(keyA, lead({ customer: { firstName: "Sam", email }, property: { addressLine1: "123 main st.", city: "Bellingham", state: "WA", zip: "98225-1234" } }));
    expect(b.body.data.customerId).toBe(a.body.data.customerId);
    expect(b.body.data.propertyId).not.toBe(a.body.data.propertyId);
    expect(c.body.data.propertyId).toBe(a.body.data.propertyId);
    expect((await m.prisma.customer.findUniqueOrThrow({ where: { id: a.body.data.customerId } })).firstName).toBe("Sam");
  });

  it("same externalRef twice updates the estimate, no duplicates", async () => {
    const body = lead();
    const first = await post(keyA, body);
    const second = await post(keyA, { ...body, estimate: { ...body.estimate, title: "Updated", lineItems: [lights[0]] } });
    expect(second.status).toBe(200);
    expect(second.body.data).toMatchObject({ created: false, estimateId: first.body.data.estimateId, estimateNumber: first.body.data.estimateNumber });
    expect(await m.prisma.estimate.count({ where: { organizationId: orgA, externalRef: body.externalRef } })).toBe(1);
    const est = await m.prisma.estimate.findUniqueOrThrow({ where: { id: first.body.data.estimateId }, include: { lineItems: true } });
    expect(est.lineItems).toHaveLength(1);
    expect(est.subtotal).toBeCloseTo(4422.6, 6);
  });

  it("phone-only leads match across formats and fill blanks", async () => {
    const phone = `360555${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const a = await post(keyA, lead({ customer: { firstName: "Phil", phone: `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`, tags: ["a"] } }));
    expect(a.status).toBe(201);
    const b = await post(keyA, lead({ customer: { firstName: "Phil", lastName: "Smith", phone: `+1 ${phone}`, email: `phil-${uid()}@example.com`, tags: ["b"] } }));
    expect(b.body.data.customerId).toBe(a.body.data.customerId);
    const c = await m.prisma.customer.findUniqueOrThrow({ where: { id: a.body.data.customerId } });
    expect(c.lastName).toBe("Smith");
    expect(c.tags.sort()).toEqual(["a", "b"]);
  });

  it("SENT emails once; accepted estimates can't be changed (409); validation errors are 400", async () => {
    const body = lead({ estimate: { ...lead().estimate, status: "SENT" } });
    const r = await post(keyA, body);
    const sent = await m.prisma.estimate.findUniqueOrThrow({ where: { id: r.body.data.estimateId } });
    expect(sent.status).toBe("SENT");
    await post(keyA, body);
    expect((await m.prisma.estimate.findUniqueOrThrow({ where: { id: sent.id } })).sentAt).toEqual(sent.sentAt);
    await m.prisma.estimate.update({ where: { id: sent.id }, data: { status: "ACCEPTED" } });
    expect((await post(keyA, body)).status).toBe(409);
    expect((await post(keyA, lead({ customer: { firstName: "Nobody" } }))).status).toBe(400);
    expect((await post(keyA, lead({ serviceType: "NOPE" }))).status).toBe(400);
  });

  it("org A's key can never read or write org B's data", async () => {
    const body = lead();
    const a = await post(keyA, body);
    const b = await post(keyB, body);
    expect(b.status).toBe(201);
    expect(b.body.data.estimateId).not.toBe(a.body.data.estimateId);
    expect(b.body.data.customerId).not.toBe(a.body.data.customerId);
    const estB = await m.prisma.estimate.findUniqueOrThrow({ where: { id: b.body.data.estimateId }, include: { lineItems: true } });
    expect(estB.organizationId).toBe(orgB);
    expect(estB.lineItems.every((li) => li.productId === null)).toBe(true);
    const pa = await getProducts(keyA);
    expect(pa.body.data.map((p: { sku: string }) => p.sku).sort()).toEqual(["c9-roofline", "timer"]);
    const pb = await getProducts(keyB, "?category=holiday%20lighting");
    expect(pb.body.data.map((p: { sku: string }) => p.sku)).toEqual(["b-only"]);
  });
});
