import { describe, expect, it } from "vitest";

import {
  MASTER_PASSWORD_MIN_LENGTH,
  isMasterPasswordLongEnough,
} from "./master-password-policy";

describe("isMasterPasswordLongEnough", () => {
  it("最少字符数是 8", () => {
    expect(MASTER_PASSWORD_MIN_LENGTH).toBe(8);
  });

  it("恰好达到最少字符数时通过", () => {
    expect(isMasterPasswordLongEnough("a".repeat(8))).toBe(true);
  });

  it("少于最少字符数时不通过", () => {
    expect(isMasterPasswordLongEnough("a".repeat(7))).toBe(false);
    expect(isMasterPasswordLongEnough("")).toBe(false);
  });

  it("按字符而不是按 UTF-16 单元计数", () => {
    expect(isMasterPasswordLongEnough("😀".repeat(7))).toBe(false);
    expect(isMasterPasswordLongEnough("😀".repeat(8))).toBe(true);
    expect(isMasterPasswordLongEnough("密".repeat(8))).toBe(true);
  });
});
