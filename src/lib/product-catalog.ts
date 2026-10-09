// Default price-list entries. Used to seed an org's Product table and as the
// exclusion calculator's offline fallback. Safe to import from client code.

export type CatalogUnit = "EACH" | "LINEAR_FT" | "SQ_FT" | "HOUR" | "FLAT";

export type CatalogProduct = {
  sku: string;
  name: string;
  category: string;
  serviceType: "RODENT_EXCLUSION" | "HOLIDAY_LIGHTING";
  unit: CatalogUnit;
  unitPrice: number;
  description?: string;
  sortOrder: number;
};

export const EXCLUSION_CATEGORY = "Exclusion";
export const HOLIDAY_CATEGORY = "Holiday Lighting";

// Prices match the exclusion calculator's original hardcoded tables.
export const EXCLUSION_PRODUCTS: CatalogProduct[] = [
  { sku: "rodent-shield",         name: "Rodent-shield",                    unit: "LINEAR_FT", unitPrice: 8 },
  { sku: "rodexit",               name: "RodeXit",                          unit: "LINEAR_FT", unitPrice: 12 },
  { sku: "ridge-guard",           name: "Ridge Guard / Peak Protector",     unit: "LINEAR_FT", unitPrice: 10 },
  { sku: "foundation-vent",       name: "Foundation vent guard",            unit: "EACH",      unitPrice: 75 },
  { sku: "roof-vent",             name: "Roof vent guard",                  unit: "EACH",      unitPrice: 85 },
  { sku: "bathroom-vent-bird",    name: "Bathroom vent bird guard",         unit: "EACH",      unitPrice: 65 },
  { sku: "garage-trim-shield",    name: "Garage trim shield",               unit: "EACH",      unitPrice: 45 },
  { sku: "garage-guard-kit",      name: "Garage guard kit",                 unit: "EACH",      unitPrice: 120 },
  { sku: "door-sweep-low36",      name: 'Door sweep – Low-profile 36"',     unit: "EACH",      unitPrice: 120 },
  { sku: "door-sweep-low48",      name: 'Door sweep – Low-profile 48"',     unit: "EACH",      unitPrice: 150 },
  { sku: "door-sweep-standard36", name: 'Door sweep – Standard 36"',        unit: "EACH",      unitPrice: 180 },
  { sku: "door-sweep-standard48", name: 'Door sweep – Standard 48"',        unit: "EACH",      unitPrice: 210 },
  { sku: "door-sweep-versa36",    name: 'Door sweep – Versa-Line 36"',      unit: "EACH",      unitPrice: 255 },
  { sku: "door-sweep-versa48",    name: 'Door sweep – Versa-Line 48"',      unit: "EACH",      unitPrice: 300 },
  { sku: "crawl-door-standard",   name: "Standard aluminum crawl door",     unit: "EACH",      unitPrice: 400 },
  { sku: "crawl-door-oversized",  name: "Oversized aluminum crawl door",    unit: "EACH",      unitPrice: 525 },
  { sku: "cement-crawl-well",     name: "Cement crawlspace well",           unit: "EACH",      unitPrice: 150 },
  { sku: "remote-surcharge",      name: "Remote-area surcharge",            unit: "FLAT",      unitPrice: 150 },
].map((p, i) => ({ ...p, category: EXCLUSION_CATEGORY, serviceType: "RODENT_EXCLUSION" as const, sortOrder: i, unit: p.unit as CatalogUnit }));

// Placeholder prices for the owner to replace; names say SAMPLE so they stand out.
export const HOLIDAY_SAMPLE_PRODUCTS: CatalogProduct[] = [
  { sku: "c9-roofline",      name: "SAMPLE – C9 LED roofline",      unit: "LINEAR_FT", unitPrice: 9.1 },
  { sku: "c7-roofline",      name: "SAMPLE – C7 LED roofline",      unit: "LINEAR_FT", unitPrice: 8.5 },
  { sku: "mini-lights",      name: "SAMPLE – Mini lights",          unit: "LINEAR_FT", unitPrice: 4 },
  { sku: "lit-garland",      name: "SAMPLE – Lit garland",          unit: "LINEAR_FT", unitPrice: 12 },
  { sku: "wreath",           name: "SAMPLE – Wreath",               unit: "EACH",      unitPrice: 85 },
  { sku: "pathway-stake",    name: "SAMPLE – Pathway light stake",  unit: "EACH",      unitPrice: 12 },
  { sku: "timer",            name: "SAMPLE – Timer / controller",   unit: "EACH",      unitPrice: 45 },
  { sku: "takedown-storage", name: "SAMPLE – Takedown & storage",   unit: "FLAT",      unitPrice: 150 },
].map((p, i) => ({
  ...p,
  category: HOLIDAY_CATEGORY,
  serviceType: "HOLIDAY_LIGHTING" as const,
  sortOrder: i,
  unit: p.unit as CatalogUnit,
  description: "Sample price. Replace with your own.",
}));

export const CATALOG_SETS = {
  exclusion: EXCLUSION_PRODUCTS,
  "holiday-samples": HOLIDAY_SAMPLE_PRODUCTS,
} as const;
export type CatalogSet = keyof typeof CATALOG_SETS;

export const UNIT_LABELS: Record<CatalogUnit, string> = {
  EACH: "each",
  LINEAR_FT: "per ft",
  SQ_FT: "per sq ft",
  HOUR: "per hour",
  FLAT: "flat",
};
