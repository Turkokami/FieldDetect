// Seeds default price-list products for every organization, based on its
// enabled modules (exclusion prices for RODENT_EXCLUSION, sample holiday
// lighting products for HOLIDAY_LIGHTING). Idempotent: only adds missing skus.
//
// Runs during the build after migrations. It never fails the build: a seeding
// problem is logged and the deploy continues (the calculator has fallbacks).
//
//   npx tsx scripts/seed-products.ts
import { prisma } from "../src/lib/prisma";
import { catalogSetsForModules, seedCatalog } from "../src/lib/products";

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, enabledModules: true } });
  for (const org of orgs) {
    for (const set of catalogSetsForModules(org.enabledModules)) {
      const added = await seedCatalog(org.id, set);
      if (added > 0) console.log(`seed-products: ${org.name}: added ${added} ${set} product(s)`);
    }
  }
  console.log(`seed-products: checked ${orgs.length} organization(s)`);
}

main()
  .catch((err) => console.error("seed-products: skipped after error:", err))
  .finally(() => prisma.$disconnect());
