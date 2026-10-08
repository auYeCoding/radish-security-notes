import { describe, expect, it } from "vitest";

import {
  MASTER_PASSWORD_MIN_LENGTH,
  MASTER_PASSWORD_RECOMMENDED_LENGTH,
  isMasterPasswordLongEnough,
} from "./master-password-policy";

describe("建议的主密码字符数", () => {
  it("是 12, 比最少字符数多, 且只是建议: 低于它但达到最少字符数仍通过", () => {
    expect(MASTER_PASSWORD_RECOMMENDED_LENGTH).toBe(12);
    expect(MASTER_PASSWORD_RECOMMENDED_LENGTH).toBeGreaterThan(
      MASTER_PASSWORD_MIN_LENGTH,
    );
    expect(
      isMasterPasswordLongEnough("a".repeat(MASTER_PASSWORD_MIN_LENGTH)),
    ).toBe(true);
  });
});

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
