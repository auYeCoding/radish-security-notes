import { describe, expect, it } from "vitest";

import { requireNewEntryInput } from "./new-entry-input-guard";

/**
 * 一份类型都正确的新建输入.
 */
const VALID_INPUT = {
  type: "bankCard",
  name: "n",
  fields: { cardNumber: "6222", expiry: "12/30" },
  notes: "第一行\n第二行",
  notesFormat: "markdown",
  customFields: [{ label: "助记词", value: "a b\nc", isHidden: true }],
  totp: "JBSWY3DPEHPK3PXP",
};

describe("requireNewEntryInput", () => {
  it("类型都正确时原样返回, 多余的属性被丢弃", () => {
    const result = requireNewEntryInput({
      ...VALID_INPUT,
      extra: "ignored",
      customFields: [{ ...VALID_INPUT.customFields[0], extra: "ignored" }],
    });

    expect(result).toEqual(VALID_INPUT);
  });

  it("没有自定义字段时数组为空也通过, 类型字段为空对象也通过", () => {
    expect(
      requireNewEntryInput({ ...VALID_INPUT, customFields: [] }).customFields,
    ).toEqual([]);
    expect(requireNewEntryInput({ ...VALID_INPUT, fields: {} }).fields).toEqual(
      {},
    );
  });

  it("不是对象, 缺少字符串字段或字段类型不对时抛出错误", () => {
    for (const input of [
      undefined,
      null,
      "text",
      { ...VALID_INPUT, name: undefined },
      { ...VALID_INPUT, notes: null },
      { ...VALID_INPUT, totp: undefined },
      { ...VALID_INPUT, totp: 123456 },
    ]) {
      expect(() => requireNewEntryInput(input)).toThrow("无效的条目内容");
    }
  });
});

describe("requireNewEntryInput 备注格式", () => {
  it("纯文本与 Markdown 都通过, 原样返回", () => {
    expect(
      requireNewEntryInput({ ...VALID_INPUT, notesFormat: "plain" })
        .notesFormat,
    ).toBe("plain");
    expect(requireNewEntryInput(VALID_INPUT).notesFormat).toBe("markdown");
  });

  it("缺失, 不在共享层取值里或不是字符串时抛出错误", () => {
    for (const notesFormat of [
      undefined,
      null,
      "html",
      "Markdown",
      "",
      1,
      {},
    ]) {
      expect(() =>
        requireNewEntryInput({ ...VALID_INPUT, notesFormat }),
      ).toThrow("无效的条目内容");
    }
  });
});

describe("requireNewEntryInput 类型与类型字段", () => {
  it("类型是字符串时原样返回, 自定义类型键也通过, 键是否有效由服务判定", () => {
    expect(
      requireNewEntryInput({ ...VALID_INPUT, type: "custom:abc" }).type,
    ).toBe("custom:abc");
    expect(requireNewEntryInput({ ...VALID_INPUT, type: "unknown" }).type).toBe(
      "unknown",
    );
  });

  it("类型不是字符串, 或类型字段不是值都为字符串的对象时抛出错误", () => {
    for (const input of [
      { ...VALID_INPUT, type: undefined },
      { ...VALID_INPUT, type: null },
      { ...VALID_INPUT, type: 1 },
      { ...VALID_INPUT, fields: undefined },
      { ...VALID_INPUT, fields: "text" },
      { ...VALID_INPUT, fields: { cardNumber: 1 } },
      { ...VALID_INPUT, fields: { cardNumber: null } },
    ]) {
      expect(() => requireNewEntryInput(input)).toThrow("无效的条目内容");
    }
  });

  it("自定义字段不是数组, 或其中的元素类型不对时抛出错误", () => {
    for (const customFields of [
      undefined,
      "text",
      { label: "a", value: "b", isHidden: false },
      [null],
      [{ label: "a", value: "b" }],
      [{ label: 1, value: "b", isHidden: false }],
      [{ label: "a", value: "b", isHidden: "yes" }],
    ]) {
      expect(() =>
        requireNewEntryInput({ ...VALID_INPUT, customFields }),
      ).toThrow("无效的条目内容");
    }
  });
});
