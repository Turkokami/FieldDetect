import { describe, expect, it } from "vitest";
import { normalizeAddressKey, normalizePhone } from "@/lib/lead-matching";

describe("normalizePhone", () => {
  it.each([
    ["(360) 555-0199", "+13605550199"],
    ["360.555.0199", "+13605550199"],
    ["1-360-555-0199", "+13605550199"],
    ["+1 360 555 0199", "+13605550199"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("%s → %s", (raw, e164) => expect(normalizePhone(raw)).toBe(e164));
  it("returns null for blanks", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("n/a")).toBeNull();
  });
});

describe("normalizeAddressKey", () => {
  it("treats common spellings of the same address as equal", () => {
    const a = normalizeAddressKey("123 Main Street", "98225");
    expect(normalizeAddressKey("123 main st.", "98225-1234")).toBe(a);
    expect(normalizeAddressKey("123  MAIN  ST", "98225")).toBe(a);
  });
  it("normalizes directions and suffixes", () => {
    expect(normalizeAddressKey("9 North Oak Avenue", "98248")).toBe(normalizeAddressKey("9 N Oak Ave", "98248"));
  });
  it("keeps different addresses or zips apart", () => {
    expect(normalizeAddressKey("123 Main St", "98225")).not.toBe(normalizeAddressKey("125 Main St", "98225"));
    expect(normalizeAddressKey("123 Main St", "98225")).not.toBe(normalizeAddressKey("123 Main St", "98226"));
  });
});
