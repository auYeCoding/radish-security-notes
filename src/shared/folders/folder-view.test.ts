import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import {
  ALL_ENTRIES_VIEW,
  UNCATEGORIZED_VIEW,
  countEntriesInView,
  entriesInView,
  folderViewOf,
  followEntryView,
  isEntryInView,
  isSameView,
  viewOfFolderId,
} from "./folder-view";

/**
 * 构造一个测试用的条目摘要.
 * @param id 条目编号.
 * @param folderId 所属文件夹编号, 未分类时省略.
 * @returns 条目摘要.
 */
function summaryOf(id: string, folderId?: string): EntrySummary {
  return { id, name: id, type: "login", account: "", folderId };
}

/**
 * 测试用的四个条目: 两个在甲, 一个在乙, 一个未分类.
 */
const ENTRIES: readonly EntrySummary[] = [
  summaryOf("a-1", "folder-a"),
  summaryOf("b-1", "folder-b"),
  summaryOf("a-2", "folder-a"),
  summaryOf("loose"),
];

describe("入口的构造与比较", () => {
  it("viewOfFolderId 有文件夹时是该文件夹, 没有时是未分类", () => {
    expect(viewOfFolderId("folder-a")).toEqual(folderViewOf("folder-a"));
    expect(viewOfFolderId(undefined)).toEqual(UNCATEGORIZED_VIEW);
  });

  it("isSameView 只有种类与文件夹编号都相同才相同", () => {
    expect(isSameView(ALL_ENTRIES_VIEW, ALL_ENTRIES_VIEW)).toBe(true);
    expect(isSameView(UNCATEGORIZED_VIEW, UNCATEGORIZED_VIEW)).toBe(true);
    expect(isSameView(folderViewOf("a"), folderViewOf("a"))).toBe(true);
    expect(isSameView(folderViewOf("a"), folderViewOf("b"))).toBe(false);
    expect(isSameView(ALL_ENTRIES_VIEW, UNCATEGORIZED_VIEW)).toBe(false);
    expect(isSameView(folderViewOf("a"), UNCATEGORIZED_VIEW)).toBe(false);
  });
});

describe("按入口取条目", () => {
  it("全部条目入口返回原数组, 保持顺序", () => {
    expect(entriesInView(ENTRIES, ALL_ENTRIES_VIEW)).toBe(ENTRIES);
  });

  it("文件夹入口只留其中的条目, 保持原有顺序", () => {
    const result = entriesInView(ENTRIES, folderViewOf("folder-a"));

    expect(result.map((entry) => entry.id)).toEqual(["a-1", "a-2"]);
  });

  it("未分类入口只留没有所属文件夹的条目", () => {
    const result = entriesInView(ENTRIES, UNCATEGORIZED_VIEW);

    expect(result.map((entry) => entry.id)).toEqual(["loose"]);
  });

  it("文件夹里没有条目或文件夹不存在时为空", () => {
    expect(entriesInView(ENTRIES, folderViewOf("missing"))).toEqual([]);
  });

  it("isEntryInView 与 countEntriesInView 按同样的规则判断与计数", () => {
    expect(
      isEntryInView(summaryOf("x", "folder-a"), folderViewOf("folder-a")),
    ).toBe(true);
    expect(isEntryInView(summaryOf("x"), folderViewOf("folder-a"))).toBe(false);
    expect(countEntriesInView(ENTRIES, ALL_ENTRIES_VIEW)).toBe(4);
    expect(countEntriesInView(ENTRIES, folderViewOf("folder-a"))).toBe(2);
    expect(countEntriesInView(ENTRIES, folderViewOf("folder-b"))).toBe(1);
    expect(countEntriesInView(ENTRIES, UNCATEGORIZED_VIEW)).toBe(1);
  });
});

describe("入口跟随条目", () => {
  it("当前是全部条目时不变", () => {
    expect(followEntryView(ALL_ENTRIES_VIEW, "folder-a")).toBe(
      ALL_ENTRIES_VIEW,
    );
    expect(followEntryView(ALL_ENTRIES_VIEW, undefined)).toBe(ALL_ENTRIES_VIEW);
  });

  it("条目仍属于当前入口时不变", () => {
    const view = folderViewOf("folder-a");

    expect(followEntryView(view, "folder-a")).toBe(view);
    expect(followEntryView(UNCATEGORIZED_VIEW, undefined)).toBe(
      UNCATEGORIZED_VIEW,
    );
  });

  it("条目改到别处时切到它新所属的入口, 未分类则切到未分类", () => {
    expect(followEntryView(folderViewOf("folder-a"), "folder-b")).toEqual(
      folderViewOf("folder-b"),
    );
    expect(followEntryView(UNCATEGORIZED_VIEW, "folder-b")).toEqual(
      folderViewOf("folder-b"),
    );
    expect(followEntryView(folderViewOf("folder-a"), undefined)).toEqual(
      UNCATEGORIZED_VIEW,
    );
  });
});
