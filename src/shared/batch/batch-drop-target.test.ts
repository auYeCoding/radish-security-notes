import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import { batchOfDragSource, resolveBatchDrop } from "./batch-drop-target";

/**
 * 测试用的条目摘要: 甲与乙在工作文件夹里, 丙没有所属文件夹.
 */
const ENTRIES: readonly EntrySummary[] = [
  { id: "a", name: "甲", type: "login", account: "", folderId: "work" },
  { id: "b", name: "乙", type: "login", account: "", folderId: "work" },
  { id: "c", name: "丙", type: "login", account: "" },
];

describe("batchOfDragSource", () => {
  it("被拖的条目已勾选时带走全部已勾选的条目", () => {
    expect(batchOfDragSource(new Set(["c", "a"]), "c")).toEqual(["c", "a"]);
  });

  it("被拖的条目没有勾选时不属于整批", () => {
    expect(batchOfDragSource(new Set(["a"]), "b")).toBeUndefined();
    expect(batchOfDragSource(new Set(), "a")).toBeUndefined();
  });
});

describe("resolveBatchDrop", () => {
  it("把整批条目放在另一个文件夹上时给出全部条目, 顺序按条目列表", () => {
    expect(resolveBatchDrop(ENTRIES, ["c", "a"], "home")).toEqual({
      entryIds: ["a", "c"],
      folderId: "home",
    });
  });

  it("已经在目标里的条目被剔除", () => {
    expect(resolveBatchDrop(ENTRIES, ["a", "b", "c"], "work")).toEqual({
      entryIds: ["c"],
      folderId: "work",
    });
    expect(resolveBatchDrop(ENTRIES, ["a", "c"], "home")).toEqual({
      entryIds: ["a", "c"],
      folderId: "home",
    });
  });

  it("没有任何条目需要移动, 或条目都不存在时什么都不用做", () => {
    expect(resolveBatchDrop(ENTRIES, ["a", "b"], "work")).toBeUndefined();
    expect(resolveBatchDrop(ENTRIES, ["missing"], "work")).toBeUndefined();
    expect(resolveBatchDrop(ENTRIES, [], "work")).toBeUndefined();
  });
});
