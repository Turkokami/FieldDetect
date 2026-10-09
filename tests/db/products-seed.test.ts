import { beforeAll, expect, it } from "vitest";
import { describeDb, migrateTestDb, uid } from "./helpers";

describeDb("price list seeding", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let seedCatalog: typeof import("@/lib/products").seedCatalog;

  beforeAll(async () => {
    migrateTestDb();
    prisma = (await import("@/lib/prisma")).prisma;
    seedCatalog = (await import("@/lib/products")).seedCatalog;
  });

  it("adds only missing skus: never overwrites edited prices or revives archived products", async () => {
    const org = await prisma.organization.create({ data: { name: "Excl", slug: `ex-${uid()}`, enabledModules: ["RODENT_EXCLUSION"] } });
    expect(await seedCatalog(org.id, "exclusion")).toBe(18);
    await prisma.product.updateMany({ where: { organizationId: org.id, sku: "rodent-shield" }, data: { unitPrice: 9.5 } });
    await prisma.product.updateMany({ where: { organizationId: org.id, sku: "rodexit" }, data: { isActive: false } });
    await prisma.product.deleteMany({ where: { organizationId: org.id, sku: "roof-vent" } });
    expect(await seedCatalog(org.id, "exclusion")).toBe(1);
    expect((await prisma.product.findFirstOrThrow({ where: { organizationId: org.id, sku: "rodent-shield" } })).unitPrice).toBe(9.5);
    expect((await prisma.product.findFirstOrThrow({ where: { organizationId: org.id, sku: "rodexit" } })).isActive).toBe(false);
    expect(await seedCatalog(org.id, "holiday-samples")).toBe(8);
  });
});
