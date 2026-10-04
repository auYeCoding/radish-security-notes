import { describe, expect, it } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import {
  defineField,
  defineEntryType,
} from "@shared/entries/entry-field-types";
import { LOGIN_TYPE } from "@shared/entries/preset-types/login-type";

import { entryFieldName, entryTypeName } from "./entry-type-naming";

/**
 * 测试用的自定义类型定义: 类型名与字段名都是用户自己定的.
 */
const CUSTOM_TYPE = {
  ...defineEntryType("custom:t1", [
    { ...defineField("field-a"), name: "口令" },
  ]),
  name: "路由器",
};

/**
 * 创建中文翻译函数.
 * @returns 中文翻译函数.
 */
async function createChineseTranslator(): Promise<
  Awaited<ReturnType<typeof createI18nInstance>>["t"]
> {
  const i18n = await createI18nInstance({
    language: "zh",
    isPseudoLocalizationEnabled: false,
  });
  return i18n.t;
}

describe("entryTypeName", () => {
  it("预设类型按类型键取当前语言的名称", async () => {
    const translate = await createChineseTranslator();

    expect(entryTypeName(LOGIN_TYPE, translate)).toBe("通用登录");
  });

  it("自定义类型直接用它的名称", async () => {
    const translate = await createChineseTranslator();

    expect(entryTypeName(CUSTOM_TYPE, translate)).toBe("路由器");
  });
});

describe("entryFieldName", () => {
  it("预设字段按字段键取当前语言的名称", async () => {
    const translate = await createChineseTranslator();

    expect(entryFieldName(defineField("password"), translate)).toBe("密码");
  });

  it("自定义字段直接用它的名称", async () => {
    const translate = await createChineseTranslator();
    const [field] = CUSTOM_TYPE.fields;

    expect(field === undefined ? "" : entryFieldName(field, translate)).toBe(
      "口令",
    );
  });

  it("既不是预设键也没有名称的字段退回字段键", async () => {
    const translate = await createChineseTranslator();

    expect(entryFieldName(defineField("field-zzz"), translate)).toBe(
      "field-zzz",
    );
  });
});
