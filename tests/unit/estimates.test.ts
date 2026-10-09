import { describe, expect, it } from "vitest";
import { computeEstimateTotals, generateEstimateNumber, generatePublicToken, escapeHtml, lineItemTotal } from "@/lib/estimates";
import { formatQuantity, unitSuffix } from "@/lib/units";

describe("computeEstimateTotals", () => {
  it("subtotal + tax% − discount (the spec's holiday example)", () => {
    const items = [
      { quantity: 486, unitPrice: 9.1 },
      { quantity: 1, unitPrice: 45 },
      { quantity: 1, unitPrice: 150 },
    ];
    const t = computeEstimateTotals(items, 8.7, 25);
    expect(t.subtotal).toBeCloseTo(4617.6, 6);
    expect(t.taxAmount).toBeCloseTo(401.7312, 6);
    expect(t.totalAmount).toBeCloseTo(4617.6 + 401.7312 - 25, 6);
    expect(lineItemTotal(items[0])).toBeCloseTo(4422.6, 6);
  });
});

describe("identifiers", () => {
  it("estimate numbers look like EST-YYMM-NNNN", () => {
    expect(generateEstimateNumber()).toMatch(/^EST-\d{4}-\d{4}$/);
  });
  it("public tokens are 24 random bytes as base64url (32 chars) and unique", () => {
    const tokens = new Set(Array.from({ length: 200 }, generatePublicToken));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe("escapeHtml", () => {
  it("escapes markup from integration payloads", () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe("&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;");
  });
});

describe("unit display", () => {
  it.each([
    ["LINEAR_FT", 486, 9.1, "486 ft × $9.10"],
    ["SQ_FT", 1477, 5.25, "1,477 sq ft × $5.25"],
    ["EACH", 1, 45, "1 × $45.00"],
    [null, 2, 10, "2 × $10.00"],
    ["FLAT", 1, 150, "flat"],
    ["HOUR", 3, 90, "3 hr × $90.00"],
  ] as const)("%s %d × %d → %s", (unit, q, p, out) => expect(formatQuantity(unit, q, p)).toBe(out));
  it("short suffixes", () => {
    expect(unitSuffix("LINEAR_FT")).toBe("ft");
    expect(unitSuffix("EACH")).toBe("");
  });
});
