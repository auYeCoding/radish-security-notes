import { describe, expect, it } from "vitest";

import { createEditEntrySchema } from "./edit-entry-schema";
import {
  createNewEntrySchema,
  ENTRY_NAME_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
} from "./new-entry-schema";
import { PRESET_ENTRY_TYPES } from "./preset-entry-types";
import { LOGIN_TYPE } from "./preset-types/login-type";
import { TOTP_INPUT_ERROR_CODES } from "./totp-input-parser";

/**
 * 通用登录的编辑校验方案, 多数测试用它.
 */
const loginSchema = createEditEntrySchema(LOGIN_TYPE);

/**
 * 补全字段后的通用登录编辑输入.
 * @param input 要覆盖的名称, 类型字段, 备注, 自定义字段, TOTP 与移除标记.
 * @returns 完整的编辑输入.
 */
function loginInputOf(
  input: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "n",
    fields: { account: "", password: "", url: "" },
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: "",
    removeTotp: false,
    ...input,
  };
}

/**
 * 校验后第一条错误的代码.
 * @param input 待校验的输入.
 * @returns 第一条错误消息, 校验通过时为 undefined.
 */
function firstErrorOf(input: unknown): string | undefined {
  const result = loginSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("createEditEntrySchema 与新建的规则一致", () => {
  it("名称为空, 超长时给出与新建相同的错误代码", () => {
    expect(firstErrorOf(loginInputOf({ name: "  " }))).toBe(
      NEW_ENTRY_ERROR_CODES.nameRequired,
    );
    expect(
      firstErrorOf(
        loginInputOf({ name: "n".repeat(ENTRY_NAME_MAX_LENGTH + 1) }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameTooLong);
  });

  it("名称去首尾空格, 字段原样保存, 类型之外的字段被丢弃", () => {
    const result = loginSchema.safeParse(
      loginInputOf({
        name: "  论坛  ",
        fields: { account: " a ", password: "", url: "", extra: "x" },
      }),
    );

    expect(result.success && result.data.name).toBe("论坛");
    expect(result.success && result.data.fields).toEqual({
      account: " a ",
      password: "",
      url: "",
    });
  });

  it("字段超长时给出字段超长的错误代码", () => {
    expect(
      firstErrorOf(
        loginInputOf({
          fields: { account: "a".repeat(201), password: "", url: "" },
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.fieldTooLong);
  });

  it("TOTP 输入为空或合法时通过, 不合法时给出解析失败的错误代码", () => {
    expect(loginSchema.safeParse(loginInputOf()).success).toBe(true);
    expect(
      loginSchema.safeParse(loginInputOf({ totp: "JBSWY3DPEHPK3PXP" })).success,
    ).toBe(true);
    expect(firstErrorOf(loginInputOf({ totp: "not base32!" }))).toBe(
      TOTP_INPUT_ERROR_CODES.invalid,
    );
  });
});

describe("createEditEntrySchema 与新建的判断一致", () => {
  it("同一份输入, 新建与编辑对内容部分的判断一致", () => {
    const newSchema = createNewEntrySchema(LOGIN_TYPE);
    const inputs = [
      loginInputOf(),
      loginInputOf({ name: "" }),
      loginInputOf({ totp: "bad!" }),
      loginInputOf({
        customFields: [{ label: " ", value: "v", isHidden: false }],
      }),
    ];

    for (const input of inputs) {
      expect(loginSchema.safeParse(input).success).toBe(
        newSchema.safeParse(input).success,
      );
    }
  });

  it.each(PRESET_ENTRY_TYPES)("$key 的每个字段取值都能通过", (type) => {
    const schema = createEditEntrySchema(type);
    const fields = Object.fromEntries(
      type.fields.map((field) => [field.key, "v"]),
    );

    const result = schema.safeParse(loginInputOf({ fields }));

    expect(result.success).toBe(true);
  });
});

describe("createEditEntrySchema 移除标记", () => {
  it("移除标记必须是布尔值", () => {
    expect(
      loginSchema.safeParse(loginInputOf({ removeTotp: true })).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse(loginInputOf({ removeTotp: "true" })).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse(loginInputOf({ removeTotp: undefined })).success,
    ).toBe(false);
  });
});
