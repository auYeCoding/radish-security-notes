import { describe, expect, it } from "vitest";

import {
  ENTRY_ACCOUNT_MAX_LENGTH,
  ENTRY_NAME_MAX_LENGTH,
  ENTRY_PASSWORD_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
  newEntrySchema,
} from "./new-entry-schema";

/**
 * 校验后第一条错误的代码.
 * @param input 待校验的输入.
 * @returns 第一条错误消息, 校验通过时为 undefined.
 */
function firstErrorOf(input: unknown): string | undefined {
  const result = newEntrySchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("newEntrySchema", () => {
  it("名称, 账号与密码都填写时通过", () => {
    const result = newEntrySchema.safeParse({
      name: "论坛",
      account: "someone",
      password: "secret",
    });

    expect(result.success).toBe(true);
  });

  it("账号与密码可以为空, 只有名称必填", () => {
    expect(
      newEntrySchema.safeParse({ name: "论坛", account: "", password: "" })
        .success,
    ).toBe(true);
    expect(firstErrorOf({ name: "", account: "a", password: "b" })).toBe(
      NEW_ENTRY_ERROR_CODES.nameRequired,
    );
  });

  it("名称去首尾空格后为空时不通过, 通过时输出已去空格的名称", () => {
    expect(firstErrorOf({ name: "   ", account: "", password: "" })).toBe(
      NEW_ENTRY_ERROR_CODES.nameRequired,
    );
    const result = newEntrySchema.safeParse({
      name: "  论坛  ",
      account: " a ",
      password: " p ",
    });
    expect(result.data).toEqual({
      name: "论坛",
      account: " a ",
      password: " p ",
    });
  });

  it("字段缺失或不是字符串时不通过", () => {
    expect(newEntrySchema.safeParse({ name: "n" }).success).toBe(false);
    expect(
      newEntrySchema.safeParse({ name: 1, account: "", password: "" }).success,
    ).toBe(false);
    expect(newEntrySchema.safeParse(undefined).success).toBe(false);
  });
});

describe("newEntrySchema 长度上限", () => {
  it("超过长度上限时不通过, 恰好等于上限时通过", () => {
    expect(
      firstErrorOf({
        name: "a".repeat(ENTRY_NAME_MAX_LENGTH + 1),
        account: "",
        password: "",
      }),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameTooLong);
    expect(
      firstErrorOf({
        name: "n",
        account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH + 1),
        password: "",
      }),
    ).toBe(NEW_ENTRY_ERROR_CODES.accountTooLong);
    expect(
      firstErrorOf({
        name: "n",
        account: "",
        password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH + 1),
      }),
    ).toBe(NEW_ENTRY_ERROR_CODES.passwordTooLong);
    expect(
      firstErrorOf({
        name: "a".repeat(ENTRY_NAME_MAX_LENGTH),
        account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH),
        password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH),
      }),
    ).toBeUndefined();
  });

  it("按字符而不是按 UTF-16 单元计数", () => {
    expect(
      firstErrorOf({
        name: "😀".repeat(ENTRY_NAME_MAX_LENGTH),
        account: "",
        password: "",
      }),
    ).toBeUndefined();
  });
});
