import { describe, expect, it } from "vitest";

import { canBeSummary } from "./custom-field-summary";

describe("canBeSummary", () => {
  it("非保密的单行字段可以作摘要", () => {
    expect(canBeSummary({ kind: "singleLine", isSensitive: false })).toBe(true);
  });

  it("保密字段不能作摘要", () => {
    expect(canBeSummary({ kind: "singleLine", isSensitive: true })).toBe(false);
  });

  it("多行字段不能作摘要", () => {
    expect(canBeSummary({ kind: "multiLine", isSensitive: false })).toBe(false);
  });

  it("保密的多行字段不能作摘要", () => {
    expect(canBeSummary({ kind: "multiLine", isSensitive: true })).toBe(false);
  });
});
