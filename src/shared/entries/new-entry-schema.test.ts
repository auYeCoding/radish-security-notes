import { describe, expect, it } from "vitest";

import {
  ENTRY_ACCOUNT_MAX_LENGTH,
  ENTRY_PASSWORD_MAX_LENGTH,
} from "./common-entry-fields";
import { CUSTOM_FIELD_ERROR_CODES } from "./custom-field-schema";
import {
  createNewEntrySchema,
  ENTRY_NAME_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
} from "./new-entry-schema";
import { PRESET_ENTRY_TYPES } from "./preset-entry-types";
import { LOGIN_TYPE } from "./preset-types/login-type";

/**
 * 通用登录的新建校验方案, 多数测试用它.
 */
const loginSchema = createNewEntrySchema(LOGIN_TYPE);

/**
 * 补全字段后的通用登录新建输入.
 * @param input 要覆盖的名称, 类型字段, 备注与自定义字段.
 * @returns 完整的新建输入.
 */
function loginInputOf(input: Record<string, unknown>): Record<string, unknown> {
  return {
    name: "n",
    fields: { account: "", password: "", url: "" },
    notes: "",
    customFields: [],
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

describe("createNewEntrySchema 名称与必填", () => {
  it("名称与全部类型字段都填写时通过", () => {
    const result = loginSchema.safeParse(
      loginInputOf({
        name: "论坛",
        fields: { account: "someone", password: "secret", url: "https://a.b" },
      }),
    );

    expect(result.success).toBe(true);
  });

  it("类型字段可以为空, 只有名称必填", () => {
    expect(loginSchema.safeParse(loginInputOf({})).success).toBe(true);
    expect(firstErrorOf(loginInputOf({ name: "" }))).toBe(
      NEW_ENTRY_ERROR_CODES.nameRequired,
    );
  });

  it("名称去首尾空格, 类型字段原样保存", () => {
    const result = loginSchema.safeParse(
      loginInputOf({
        name: "  论坛  ",
        fields: { account: " a ", password: " p ", url: " u " },
      }),
    );

    expect(result.data).toEqual({
      name: "论坛",
      fields: { account: " a ", password: " p ", url: " u " },
      notes: "",
      customFields: [],
    });
  });
});

describe("createNewEntrySchema 类型字段形状", () => {
  it("类型字段缺失或不是字符串时不通过, 类型之外的字段被丢弃", () => {
    expect(loginSchema.safeParse({ name: "n" }).success).toBe(false);
    expect(
      loginSchema.safeParse(
        loginInputOf({ fields: { account: "", password: "" } }),
      ).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse(
        loginInputOf({ fields: { account: 1, password: "", url: "" } }),
      ).success,
    ).toBe(false);
    expect(loginSchema.safeParse(undefined).success).toBe(false);
    const stripped = loginSchema.safeParse(
      loginInputOf({
        fields: { account: "", password: "", url: "", cardNumber: "6222" },
      }),
    );
    expect(stripped.data?.fields).toEqual({
      account: "",
      password: "",
      url: "",
    });
  });
});

describe("createNewEntrySchema 长度上限", () => {
  it("名称, 账号与密码超过上限时不通过", () => {
    expect(
      firstErrorOf(
        loginInputOf({ name: "a".repeat(ENTRY_NAME_MAX_LENGTH + 1) }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameTooLong);
    expect(
      firstErrorOf(
        loginInputOf({
          fields: {
            account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH + 1),
            password: "",
            url: "",
          },
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.fieldTooLong);
    expect(
      firstErrorOf(
        loginInputOf({
          fields: {
            account: "",
            password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH + 1),
            url: "",
          },
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.fieldTooLong);
  });

  it("恰好等于上限时通过, 按字符而不是按 UTF-16 单元计数", () => {
    expect(
      firstErrorOf(
        loginInputOf({
          name: "😀".repeat(ENTRY_NAME_MAX_LENGTH),
          fields: {
            account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH),
            password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH),
            url: "",
          },
        }),
      ),
    ).toBeUndefined();
  });
});

describe("createNewEntrySchema 不设上限的字段", () => {
  it("没有长度上限的字段与备注原样保存, 备注可以多行", () => {
    const url = ` https://example.test/${"p".repeat(5000)} `;
    const notes = `第一行\n${"n".repeat(20000)}\n第三行 `;

    const result = loginSchema.safeParse(
      loginInputOf({ fields: { account: "", password: "", url }, notes }),
    );

    expect(result.data).toMatchObject({ fields: { url }, notes });
  });
});

describe("createNewEntrySchema 自定义字段", () => {
  it("数量不限, 字段名去首尾空格, 字段值原样保存", () => {
    const customFields = Array.from({ length: 300 }, (_, index) => ({
      label: ` 字段 ${index} `,
      value: `第一行\n第二行 ${index} `,
      isHidden: index % 2 === 0,
    }));

    const result = loginSchema.safeParse(loginInputOf({ customFields }));

    expect(result.data?.customFields).toHaveLength(300);
    expect(result.data?.customFields[0]).toEqual({
      label: "字段 0",
      value: "第一行\n第二行 0 ",
      isHidden: true,
    });
  });

  it("字段名为空时不通过, 字段值可以为空", () => {
    const emptyLabel = loginInputOf({
      customFields: [{ label: "  ", value: "v", isHidden: false }],
    });
    const emptyValue = loginInputOf({
      customFields: [{ label: "助记词", value: "", isHidden: true }],
    });

    expect(firstErrorOf(emptyLabel)).toBe(
      CUSTOM_FIELD_ERROR_CODES.labelRequired,
    );
    expect(firstErrorOf(emptyValue)).toBeUndefined();
  });

  it("备注或自定义字段缺失, 或字段形状不对时不通过", () => {
    const withoutNotes = { name: "n", fields: {}, customFields: [] };

    expect(loginSchema.safeParse(withoutNotes).success).toBe(false);
    expect(loginSchema.safeParse(loginInputOf({ notes: 1 })).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse(
        loginInputOf({ customFields: [{ label: "a", value: "b" }] }),
      ).success,
    ).toBe(false);
  });
});

describe("createNewEntrySchema 逐个类型", () => {
  it.each(PRESET_ENTRY_TYPES)(
    "$key 的字段全为空时通过, 输出该类型的全部字段",
    (type) => {
      const fields = Object.fromEntries(
        type.fields.map((field) => [field.key, ""]),
      );

      const result = createNewEntrySchema(type).safeParse({
        name: "n",
        fields,
        notes: "",
        customFields: [],
      });

      expect(result.data?.fields).toEqual(fields);
    },
  );
});
