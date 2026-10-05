import { describe, expect, it } from "vitest";

import { EXPORT_SECRET_MAX_LENGTH } from "@shared/export/export-limits";

import { isOptionalSecret, isRecord, isStringWithin } from "./ipc-input-checks";

describe("进程边界的通用检查", () => {
  it("判断普通对象", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("text")).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });

  it("可选机密: 没给, 或长度不超过上限的字符串", () => {
    expect(isOptionalSecret(undefined)).toBe(true);
    expect(isOptionalSecret("")).toBe(true);
    expect(isOptionalSecret("a".repeat(EXPORT_SECRET_MAX_LENGTH))).toBe(true);
    expect(isOptionalSecret("a".repeat(EXPORT_SECRET_MAX_LENGTH + 1))).toBe(
      false,
    );
    expect(isOptionalSecret(1)).toBe(false);
    expect(isOptionalSecret(null)).toBe(false);
  });

  it("字符串长度上限", () => {
    expect(isStringWithin("abc", 3)).toBe(true);
    expect(isStringWithin("abcd", 3)).toBe(false);
    expect(isStringWithin(3, 3)).toBe(false);
  });
});
