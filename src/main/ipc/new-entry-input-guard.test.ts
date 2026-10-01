import { describe, expect, it } from "vitest";

import { requireNewEntryInput } from "./new-entry-input-guard";

/**
 * 一份类型都正确的新建输入.
 */
const VALID_INPUT = {
  name: "n",
  account: "a",
  password: "p",
  url: "https://example.test",
  notes: "第一行\n第二行",
  customFields: [{ label: "助记词", value: "a b\nc", isHidden: true }],
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

  it("没有自定义字段时数组为空也通过", () => {
    expect(
      requireNewEntryInput({ ...VALID_INPUT, customFields: [] }).customFields,
    ).toEqual([]);
  });

  it("不是对象, 缺少字符串字段或字段类型不对时抛出错误", () => {
    for (const input of [
      undefined,
      null,
      "text",
      { ...VALID_INPUT, name: undefined },
      { ...VALID_INPUT, account: 1 },
      { ...VALID_INPUT, url: undefined },
      { ...VALID_INPUT, notes: null },
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
