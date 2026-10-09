import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import { resolveEntryDrop } from "./folder-drop-target";

/**
 * 测试用的条目摘要: 甲在工作文件夹里, 乙没有所属文件夹.
 */
const ENTRIES: readonly EntrySummary[] = [
  { id: "a", name: "甲", type: "login", account: "", folderId: "work" },
  { id: "b", name: "乙", type: "login", account: "" },
];

describe("resolveEntryDrop", () => {
  it("条目放在另一个文件夹上时给出放入", () => {
    expect(resolveEntryDrop(ENTRIES, "a", "home")).toEqual({
      entryId: "a",
      folderId: "home",
    });
    expect(resolveEntryDrop(ENTRIES, "b", "work")).toEqual({
      entryId: "b",
      folderId: "work",
    });
  });

  it("条目已经在目标里, 或条目不存在时什么都不用做", () => {
    expect(resolveEntryDrop(ENTRIES, "a", "work")).toBeUndefined();
    expect(resolveEntryDrop(ENTRIES, "missing", "work")).toBeUndefined();
  });
});
