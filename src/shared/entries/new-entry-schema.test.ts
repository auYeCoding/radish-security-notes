import { describe, expect, it } from "vitest";

import { CUSTOM_FIELD_ERROR_CODES } from "./custom-field-schema";
import {
  ENTRY_ACCOUNT_MAX_LENGTH,
  ENTRY_NAME_MAX_LENGTH,
  ENTRY_PASSWORD_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
  newEntrySchema,
} from "./new-entry-schema";

/**
 * 补全网址, 备注与自定义字段后的新建输入.
 * @param input 名称, 账号, 密码, 以及要覆盖的其它字段.
 * @returns 完整的新建输入.
 */
function inputOf(input: Record<string, unknown>): Record<string, unknown> {
  return { url: "", notes: "", customFields: [], ...input };
}

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
    const result = newEntrySchema.safeParse(
      inputOf({ name: "论坛", account: "someone", password: "secret" }),
    );

    expect(result.success).toBe(true);
  });

  it("账号与密码可以为空, 只有名称必填", () => {
    expect(
      newEntrySchema.safeParse(
        inputOf({ name: "论坛", account: "", password: "" }),
      ).success,
    ).toBe(true);
    expect(
      firstErrorOf(inputOf({ name: "", account: "a", password: "b" })),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameRequired);
  });

  it("名称去首尾空格后为空时不通过, 通过时输出已去空格的名称", () => {
    expect(
      firstErrorOf(inputOf({ name: "   ", account: "", password: "" })),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameRequired);
    const result = newEntrySchema.safeParse(
      inputOf({ name: "  论坛  ", account: " a ", password: " p " }),
    );
    expect(result.data).toEqual({
      name: "论坛",
      account: " a ",
      password: " p ",
      url: "",
      notes: "",
      customFields: [],
    });
  });

  it("字段缺失或不是字符串时不通过", () => {
    expect(newEntrySchema.safeParse({ name: "n" }).success).toBe(false);
    expect(
      newEntrySchema.safeParse(inputOf({ name: 1, account: "", password: "" }))
        .success,
    ).toBe(false);
    expect(newEntrySchema.safeParse(undefined).success).toBe(false);
  });
});

describe("newEntrySchema 长度上限", () => {
  it("超过长度上限时不通过", () => {
    expect(
      firstErrorOf(
        inputOf({
          name: "a".repeat(ENTRY_NAME_MAX_LENGTH + 1),
          account: "",
          password: "",
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.nameTooLong);
    expect(
      firstErrorOf(
        inputOf({
          name: "n",
          account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH + 1),
          password: "",
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.accountTooLong);
    expect(
      firstErrorOf(
        inputOf({
          name: "n",
          account: "",
          password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH + 1),
        }),
      ),
    ).toBe(NEW_ENTRY_ERROR_CODES.passwordTooLong);
  });

  it("恰好等于上限时通过", () => {
    expect(
      firstErrorOf(
        inputOf({
          name: "a".repeat(ENTRY_NAME_MAX_LENGTH),
          account: "a".repeat(ENTRY_ACCOUNT_MAX_LENGTH),
          password: "p".repeat(ENTRY_PASSWORD_MAX_LENGTH),
        }),
      ),
    ).toBeUndefined();
  });
});

describe("newEntrySchema 字符计数", () => {
  it("按字符而不是按 UTF-16 单元计数", () => {
    expect(
      firstErrorOf(
        inputOf({
          name: "😀".repeat(ENTRY_NAME_MAX_LENGTH),
          account: "",
          password: "",
        }),
      ),
    ).toBeUndefined();
  });
});

describe("newEntrySchema 网址, 备注与自定义字段", () => {
  it("网址与备注原样保存, 不设长度上限, 备注可以多行", () => {
    const url = ` https://example.test/${"p".repeat(5000)} `;
    const notes = `第一行\n${"n".repeat(20000)}\n第三行 `;

    const result = newEntrySchema.safeParse(
      inputOf({ name: "n", account: "", password: "", url, notes }),
    );

    expect(result.data).toMatchObject({ url, notes });
  });

  it("自定义字段数量不限, 字段名去首尾空格, 字段值原样保存", () => {
    const customFields = Array.from({ length: 300 }, (_, index) => ({
      label: ` 字段 ${index} `,
      value: `第一行\n第二行 ${index} `,
      isHidden: index % 2 === 0,
    }));

    const result = newEntrySchema.safeParse(
      inputOf({ name: "n", account: "", password: "", customFields }),
    );

    expect(result.data?.customFields).toHaveLength(300);
    expect(result.data?.customFields[0]).toEqual({
      label: "字段 0",
      value: "第一行\n第二行 0 ",
      isHidden: true,
    });
  });
});

describe("newEntrySchema 自定义字段校验", () => {
  it("自定义字段的字段名为空时不通过, 字段值可以为空", () => {
    const emptyLabel = inputOf({
      name: "n",
      account: "",
      password: "",
      customFields: [{ label: "  ", value: "v", isHidden: false }],
    });
    const emptyValue = inputOf({
      name: "n",
      account: "",
      password: "",
      customFields: [{ label: "助记词", value: "", isHidden: true }],
    });

    expect(firstErrorOf(emptyLabel)).toBe(
      CUSTOM_FIELD_ERROR_CODES.labelRequired,
    );
    expect(firstErrorOf(emptyValue)).toBeUndefined();
  });

  it("网址, 备注或自定义字段缺失, 或字段形状不对时不通过", () => {
    const base = { name: "n", account: "", password: "" };

    expect(newEntrySchema.safeParse(base).success).toBe(false);
    expect(newEntrySchema.safeParse(inputOf({ ...base, url: 1 })).success).toBe(
      false,
    );
    expect(
      newEntrySchema.safeParse(
        inputOf({ ...base, customFields: [{ label: "a", value: "b" }] }),
      ).success,
    ).toBe(false);
  });
});
