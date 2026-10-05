import { describe, expect, it } from "vitest";

import type { ExportEntry } from "./export-dataset";
import {
  restrictToReferenced,
  selectRowsInScope,
} from "./export-scope-resolver";

/**
 * 构造一个只带引用关系的样例条目.
 * @param id 条目编号.
 * @param overrides 要覆盖的部分.
 * @returns 数据集里的条目.
 */
function entryOf(
  id: string,
  overrides: Partial<ExportEntry> = {},
): ExportEntry {
  return {
    id,
    typeKey: "login",
    name: id,
    fields: {},
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: undefined,
    folderId: undefined,
    tagIds: [],
    createdAt: 1,
    attachments: [],
    ...overrides,
  };
}

describe("导出范围筛选", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("全部范围保留所有行, 返回新数组", () => {
    const result = selectRowsInScope(rows, { kind: "all" });
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("指定条目的范围只留编号在其中的行, 保持原先后顺序", () => {
    expect(
      selectRowsInScope(rows, { kind: "entries", entryIds: ["c", "a"] }),
    ).toEqual([{ id: "a" }, { id: "c" }]);
  });

  it("不存在的编号被忽略, 重复编号只算一次, 空列表得到空结果", () => {
    expect(
      selectRowsInScope(rows, { kind: "entries", entryIds: ["z", "b", "b"] }),
    ).toEqual([{ id: "b" }]);
    expect(selectRowsInScope(rows, { kind: "entries", entryIds: [] })).toEqual(
      [],
    );
  });
});

describe("只留被引用的文件夹, 标签与自定义类型", () => {
  const labels = {
    folders: [
      { id: "f1", name: "一" },
      { id: "f2", name: "二" },
    ],
    tags: [
      { id: "t1", name: "甲", color: "red" as const },
      { id: "t2", name: "乙", color: "blue" as const },
    ],
    customEntryTypes: [
      { id: "c1", key: "custom:c1", name: "类型一", fields: [] },
      { id: "c2", key: "custom:c2", name: "类型二", fields: [] },
    ],
  };

  it("保持各自原来的先后顺序", () => {
    const result = restrictToReferenced(
      [
        entryOf("e1", { folderId: "f2", tagIds: ["t2", "t1"] }),
        entryOf("e2", { typeKey: "custom:c2" }),
      ],
      labels,
    );
    expect(result.folders.map((folder) => folder.id)).toEqual(["f2"]);
    expect(result.tags.map((tag) => tag.id)).toEqual(["t1", "t2"]);
    expect(result.customEntryTypes.map((type) => type.id)).toEqual(["c2"]);
  });

  it("没有被引用的项时都为空", () => {
    expect(restrictToReferenced([entryOf("e1")], labels)).toEqual({
      folders: [],
      tags: [],
      customEntryTypes: [],
    });
  });
});
