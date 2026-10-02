import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  NEW_PASSWORD_ERROR_CODES,
  PASSWORD_MISMATCH_ISSUE,
  isPasswordConfirmed,
  newPasswordShape,
} from "./new-password-rules";

/**
 * 引导页与恢复页共用的新主密码校验方案.
 */
const schema = z
  .object(newPasswordShape)
  .refine(isPasswordConfirmed, PASSWORD_MISMATCH_ISSUE);

describe("新主密码规则", () => {
  it("够长且两次一致时通过", () => {
    const result = schema.safeParse({
      password: "correct horse",
      confirmation: "correct horse",
    });
    expect(result.success).toBe(true);
  });

  it("太短时给出 tooShort 错误, 挂在主密码字段上", () => {
    const result = schema.safeParse({
      password: "short",
      confirmation: "short",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["password"],
        message: NEW_PASSWORD_ERROR_CODES.tooShort,
      }),
    ]);
  });

  it("两次不一致时给出 mismatch 错误, 挂在确认字段上", () => {
    const result = schema.safeParse({
      password: "correct horse",
      confirmation: "correct hors",
    });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["confirmation"],
        message: NEW_PASSWORD_ERROR_CODES.mismatch,
      }),
    ]);
  });

  it("isPasswordConfirmed 逐字比较", () => {
    expect(isPasswordConfirmed({ password: "a", confirmation: "a" })).toBe(
      true,
    );
    expect(isPasswordConfirmed({ password: "a", confirmation: "A" })).toBe(
      false,
    );
  });
});
