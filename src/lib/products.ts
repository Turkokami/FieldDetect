import { prisma } from "@/lib/prisma";
import { CATALOG_SETS, type CatalogSet } from "@/lib/product-catalog";

/**
 * Adds a catalog set's products to an org's price list. Only creates missing
 * skus: never overwrites prices the owner has edited, and never revives
 * products they archived. Returns how many were added.
 */
export async function seedCatalog(organizationId: string, set: CatalogSet): Promise<number> {
  const result = await prisma.product.createMany({
    data: CATALOG_SETS[set].map((p) => ({
      organizationId,
      sku: p.sku,
      name: p.name,
      category: p.category,
      serviceType: p.serviceType,
      unit: p.unit,
      unitPrice: p.unitPrice,
      description: p.description ?? null,
      sortOrder: p.sortOrder,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/** Which catalog sets an org gets automatically, based on its enabled modules. */
export function catalogSetsForModules(enabledModules: string[]): CatalogSet[] {
  const sets: CatalogSet[] = [];
  if (enabledModules.includes("RODENT_EXCLUSION")) sets.push("exclusion");
  if (enabledModules.includes("HOLIDAY_LIGHTING")) sets.push("holiday-samples");
  return sets;
}
