import { describe, expect, it } from "vitest";

import {
  assignCustomFieldIdentifiers,
  findCustomField,
} from "./custom-field-records";

describe("assignCustomFieldIdentifiers", () => {
  it("按填写顺序依次分配编号, 内容不变", () => {
    let counter = 0;

    const fields = assignCustomFieldIdentifiers(
      [
        { label: "助记词", value: "a b\nc d", isHidden: true },
        { label: "编号", value: "", isHidden: false },
      ],
      () => `field-${(counter += 1)}`,
    );

    expect(fields).toEqual([
      { id: "field-1", label: "助记词", value: "a b\nc d", isHidden: true },
      { id: "field-2", label: "编号", value: "", isHidden: false },
    ]);
  });

  it("没有自定义字段时返回空数组且不消耗编号", () => {
    let counter = 0;

    const fields = assignCustomFieldIdentifiers(
      [],
      () => `f-${(counter += 1)}`,
    );

    expect(fields).toEqual([]);
    expect(counter).toBe(0);
  });
});

describe("findCustomField", () => {
  const fields = [
    { id: "a", label: "A", value: "1", isHidden: false },
    { id: "b", label: "B", value: "2", isHidden: true },
  ];

  it("按编号找到字段", () => {
    expect(findCustomField(fields, "b")).toEqual(fields[1]);
  });

  it("没有这个编号时返回 undefined", () => {
    expect(findCustomField(fields, "missing")).toBeUndefined();
  });
});
