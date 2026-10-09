import { describe, expect, it } from "vitest";
import { EXCLUSION_PRODUCTS, HOLIDAY_SAMPLE_PRODUCTS } from "@/lib/product-catalog";

// The exclusion calculator's prices before it moved to the price list.
// Seeded products and the offline fallback must match these exactly, so
// calculator totals don't change.
const ORIGINAL_PRICES: Record<string, number> = {
  "rodent-shield": 8, rodexit: 12, "ridge-guard": 10, "foundation-vent": 75, "roof-vent": 85,
  "bathroom-vent-bird": 65, "garage-trim-shield": 45, "garage-guard-kit": 120, "cement-crawl-well": 150,
  "remote-surcharge": 150, "door-sweep-low36": 120, "door-sweep-low48": 150, "door-sweep-standard36": 180,
  "door-sweep-standard48": 210, "door-sweep-versa36": 255, "door-sweep-versa48": 300,
  "crawl-door-standard": 400, "crawl-door-oversized": 525,
};

describe("exclusion catalog", () => {
  it("has exactly the calculator's original 18 prices", () => {
    expect(Object.fromEntries(EXCLUSION_PRODUCTS.map((p) => [p.sku, p.unitPrice]))).toEqual(ORIGINAL_PRICES);
  });
  it("uses linear-foot units for footage items and flat for the surcharge", () => {
    const unit = Object.fromEntries(EXCLUSION_PRODUCTS.map((p) => [p.sku, p.unit]));
    expect(unit["rodent-shield"]).toBe("LINEAR_FT");
    expect(unit["remote-surcharge"]).toBe("FLAT");
    expect(unit["foundation-vent"]).toBe("EACH");
  });
  it("skus are unique", () => {
    const skus = [...EXCLUSION_PRODUCTS, ...HOLIDAY_SAMPLE_PRODUCTS].map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
  it("holiday samples are clearly marked", () => {
    expect(HOLIDAY_SAMPLE_PRODUCTS.every((p) => p.name.startsWith("SAMPLE"))).toBe(true);
  });
});
