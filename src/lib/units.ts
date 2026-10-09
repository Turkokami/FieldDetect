// Display helpers for line-item units. Safe to import from client code.

export type LineUnit = "EACH" | "LINEAR_FT" | "SQ_FT" | "HOUR" | "FLAT" | null | undefined;

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const qty = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** "486 ft × $9.10", "1,477 sq ft × $5.25", "3 hr × $90.00", "1 × $45.00" or "flat". */
export function formatQuantity(unit: LineUnit, quantity: number, unitPrice: number) {
  switch (unit) {
    case "FLAT": return "flat";
    case "LINEAR_FT": return `${qty(quantity)} ft × ${money(unitPrice)}`;
    case "SQ_FT": return `${qty(quantity)} sq ft × ${money(unitPrice)}`;
    case "HOUR": return `${qty(quantity)} hr × ${money(unitPrice)}`;
    default: return `${qty(quantity)} × ${money(unitPrice)}`;
  }
}

/** Short unit suffix for quantity columns: "ft", "sq ft", "hr", "flat" or "". */
export function unitSuffix(unit: LineUnit) {
  switch (unit) {
    case "LINEAR_FT": return "ft";
    case "SQ_FT": return "sq ft";
    case "HOUR": return "hr";
    case "FLAT": return "flat";
    default: return "";
  }
}
