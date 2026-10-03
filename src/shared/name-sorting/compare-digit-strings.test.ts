import { describe, expect, it } from "vitest";

import { compareDigitStrings } from "./compare-digit-strings";

describe("compareDigitStrings", () => {
  it("按整数值比较, 位数多的更大", () => {
    expect(compareDigitStrings("9", "12")).toBeLessThan(0);
    expect(compareDigitStrings("12", "9")).toBeGreaterThan(0);
  });

  it("位数相同时逐位比较", () => {
    expect(compareDigitStrings("12", "13")).toBeLessThan(0);
    expect(compareDigitStrings("20", "19")).toBeGreaterThan(0);
  });

  it("前导零不影响数值", () => {
    expect(compareDigitStrings("007", "7")).toBe(0);
    expect(compareDigitStrings("007", "10")).toBeLessThan(0);
  });

  it("全零的数值都是零", () => {
    expect(compareDigitStrings("000", "0")).toBe(0);
  });

  it("超长数字串不溢出", () => {
    expect(
      compareDigitStrings("99999999999999999999", "100000000000000000000"),
    ).toBeLessThan(0);
    expect(
      compareDigitStrings("100000000000000000001", "100000000000000000000"),
    ).toBeGreaterThan(0);
  });
});
