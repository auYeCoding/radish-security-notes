import { describe, expect, it } from "vitest";

import {
  CUSTOM_FIELD_ERROR_CODES,
  customFieldInputSchema,
} from "./custom-field-schema";

describe("customFieldInputSchema", () => {
  it("字段名去首尾空格, 字段值原样保存, 多行与首尾空格都保留", () => {
    const result = customFieldInputSchema.safeParse({
      label: "  助记词  ",
      value: " word1 word2\nword3 ",
      isHidden: true,
    });

    expect(result.data).toEqual({
      label: "助记词",
      value: " word1 word2\nword3 ",
      isHidden: true,
    });
  });

  it("字段名去空格后为空时给出字段名必填的错误代码", () => {
    const result = customFieldInputSchema.safeParse({
      label: "   ",
      value: "v",
      isHidden: false,
    });

    expect(result.error?.issues[0]?.message).toBe(
      CUSTOM_FIELD_ERROR_CODES.labelRequired,
    );
  });

  it("字段值可以为空, 字段名与字段值都不设长度上限", () => {
    expect(
      customFieldInputSchema.safeParse({
        label: "l".repeat(100000),
        value: "",
        isHidden: false,
      }).success,
    ).toBe(true);
    expect(
      customFieldInputSchema.safeParse({
        label: "l",
        value: "v".repeat(100000),
        isHidden: false,
      }).success,
    ).toBe(true);
  });

  it("缺少字段或类型不对时不通过", () => {
    expect(customFieldInputSchema.safeParse({ label: "l" }).success).toBe(
      false,
    );
    expect(
      customFieldInputSchema.safeParse({ label: "l", value: "v", isHidden: 1 })
        .success,
    ).toBe(false);
  });
});
