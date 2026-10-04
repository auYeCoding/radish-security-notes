import { describe, expect, it } from "vitest";

import zh from "../../locales/zh.json";
import { admitNewCustomEntryType } from "./custom-entry-type-admission";
import { CUSTOM_ENTRY_TYPE_MAX_COUNT } from "./custom-entry-type-limits";
import type { NewCustomEntryTypeInput } from "./custom-entry-type-types";

/**
 * 构造一个合法的新建输入, 可以覆盖类型名称.
 * @param name 类型名称.
 * @returns 新建输入.
 */
function inputOf(name = "路由器"): NewCustomEntryTypeInput {
  return {
    name,
    fields: [
      { name: "地址", kind: "singleLine", isSensitive: false, isSummary: true },
    ],
  };
}

/**
 * 构造 `count` 个互不相同的已有类型名称.
 * @param count 个数.
 * @returns 名称列表.
 */
function existingNamesOf(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `类型${index}`);
}

describe("admitNewCustomEntryType 通过", () => {
  it("合法且不重名时返回校验后的输入, 名称去首尾空格", () => {
    const result = admitNewCustomEntryType(inputOf("  路由器  "), ["交换机"]);

    expect(result).toEqual({ ok: true, value: inputOf("路由器") });
  });

  it("已有类型比上限少一个时仍可新建", () => {
    const names = existingNamesOf(CUSTOM_ENTRY_TYPE_MAX_COUNT - 1);

    expect(admitNewCustomEntryType(inputOf(), names).ok).toBe(true);
  });
});

describe("admitNewCustomEntryType 拒绝", () => {
  it("内容不合规时是 invalid-input", () => {
    const result = admitNewCustomEntryType({ name: "路由器", fields: [] }, []);

    expect(result).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("个数已达上限时是 limit-reached", () => {
    const names = existingNamesOf(CUSTOM_ENTRY_TYPE_MAX_COUNT);

    expect(admitNewCustomEntryType(inputOf(), names)).toEqual({
      ok: false,
      reason: "limit-reached",
    });
  });

  it("与已有自定义类型或预设类型同名时是 name-taken", () => {
    expect(admitNewCustomEntryType(inputOf(" 路由器 "), ["路由器"])).toEqual({
      ok: false,
      reason: "name-taken",
    });
    expect(admitNewCustomEntryType(inputOf(zh.entryTypes.server), [])).toEqual({
      ok: false,
      reason: "name-taken",
    });
  });
});

describe("admitNewCustomEntryType 判定顺序", () => {
  it("内容不合规先于个数上限", () => {
    const names = existingNamesOf(CUSTOM_ENTRY_TYPE_MAX_COUNT);
    const result = admitNewCustomEntryType({ name: "", fields: [] }, names);

    expect(result).toEqual({ ok: false, reason: "invalid-input" });
  });

  it("个数上限先于重名", () => {
    const names = [
      ...existingNamesOf(CUSTOM_ENTRY_TYPE_MAX_COUNT - 1),
      "路由器",
    ];
    const result = admitNewCustomEntryType(inputOf("路由器"), names);

    expect(result).toEqual({ ok: false, reason: "limit-reached" });
  });
});
