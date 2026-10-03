import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import { folderIdFromDropTarget, resolveEntryDrop } from "./folder-drop-target";
import { UNCATEGORIZED_KEY } from "./uncategorized-key";

/**
 * 测试用的条目摘要: 甲在工作文件夹里, 乙未分类.
 */
const ENTRIES: readonly EntrySummary[] = [
  { id: "a", name: "甲", type: "login", account: "", folderId: "work" },
  { id: "b", name: "乙", type: "login", account: "" },
];

describe("folderIdFromDropTarget", () => {
  it("未分类目标换成 undefined, 文件夹目标原样返回编号", () => {
    expect(folderIdFromDropTarget(UNCATEGORIZED_KEY)).toBeUndefined();
    expect(folderIdFromDropTarget("work")).toBe("work");
  });
});

describe("resolveEntryDrop", () => {
  it("条目放在另一个文件夹上时给出放入, 放在未分类上时目标文件夹为 undefined", () => {
    expect(resolveEntryDrop(ENTRIES, "a", "home")).toEqual({
      entryId: "a",
      folderId: "home",
    });
    expect(resolveEntryDrop(ENTRIES, "a", UNCATEGORIZED_KEY)).toEqual({
      entryId: "a",
      folderId: undefined,
    });
    expect(resolveEntryDrop(ENTRIES, "b", "work")).toEqual({
      entryId: "b",
      folderId: "work",
    });
  });

  it("条目已经在目标里, 或条目不存在时什么都不用做", () => {
    expect(resolveEntryDrop(ENTRIES, "a", "work")).toBeUndefined();
    expect(resolveEntryDrop(ENTRIES, "b", UNCATEGORIZED_KEY)).toBeUndefined();
    expect(resolveEntryDrop(ENTRIES, "missing", "work")).toBeUndefined();
  });
});
