import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import {
  countEntriesWithTag,
  entriesWithAllTags,
  entryTagIdsOf,
  followEntryTags,
  hasAllTags,
  toggleTagId,
  withoutTagId,
} from "./tag-filter";

/**
 * 构造一个测试用的条目摘要.
 * @param id 条目编号.
 * @param tagIds 带的标签编号, 没有标签时省略.
 * @returns 条目摘要.
 */
function summaryOf(id: string, tagIds?: readonly string[]): EntrySummary {
  return { id, name: id, type: "login", account: "", tagIds };
}

/**
 * 测试用的四个条目: 一个带工作与个人, 一个只带工作, 一个只带个人, 一个没有标签.
 */
const ENTRIES: readonly EntrySummary[] = [
  summaryOf("both", ["work", "home"]),
  summaryOf("work-only", ["work"]),
  summaryOf("home-only", ["home"]),
  summaryOf("none"),
];

describe("条目带的标签", () => {
  it("entryTagIdsOf 没有标签时是空列表", () => {
    expect(entryTagIdsOf(summaryOf("none"))).toEqual([]);
    expect(entryTagIdsOf(summaryOf("both", ["work", "home"]))).toEqual([
      "work",
      "home",
    ]);
  });

  it("hasAllTags 要求带全部给定的标签, 给定为空时总是满足", () => {
    expect(hasAllTags(ENTRIES[0], ["work", "home"])).toBe(true);
    expect(hasAllTags(ENTRIES[1], ["work", "home"])).toBe(false);
    expect(hasAllTags(ENTRIES[3], [])).toBe(true);
  });
});

describe("按标签取条目", () => {
  it("没有已选标签时返回原数组", () => {
    expect(entriesWithAllTags(ENTRIES, [])).toBe(ENTRIES);
  });

  it("选一个标签时留下带它的条目, 保持原有顺序", () => {
    const result = entriesWithAllTags(ENTRIES, ["work"]);

    expect(result.map((entry) => entry.id)).toEqual(["both", "work-only"]);
  });

  it("选多个标签时只留同时带这些标签的条目", () => {
    const result = entriesWithAllTags(ENTRIES, ["work", "home"]);

    expect(result.map((entry) => entry.id)).toEqual(["both"]);
  });

  it("选了没有人带的标签时结果为空", () => {
    expect(entriesWithAllTags(ENTRIES, ["unknown"])).toEqual([]);
  });

  it("countEntriesWithTag 统计带某个标签的条目总数", () => {
    expect(countEntriesWithTag(ENTRIES, "work")).toBe(2);
    expect(countEntriesWithTag(ENTRIES, "home")).toBe(2);
    expect(countEntriesWithTag(ENTRIES, "unknown")).toBe(0);
  });
});

describe("已选标签的变化", () => {
  it("toggleTagId 未选中时追加在末尾, 已选中时取消", () => {
    expect(toggleTagId([], "work")).toEqual(["work"]);
    expect(toggleTagId(["work"], "home")).toEqual(["work", "home"]);
    expect(toggleTagId(["work", "home"], "work")).toEqual(["home"]);
  });

  it("withoutTagId 去掉一个标签, 本来就没选中时返回原数组", () => {
    const selected = ["work", "home"];

    expect(withoutTagId(selected, "work")).toEqual(["home"]);
    expect(withoutTagId(selected, "other")).toBe(selected);
  });

  it("followEntryTags 取消条目不再带的已选标签", () => {
    expect(followEntryTags(["work", "home"], ["home"])).toEqual(["home"]);
    expect(followEntryTags(["work"], undefined)).toEqual([]);
  });

  it("followEntryTags 条目仍带全部已选标签时返回原数组", () => {
    const selected = ["work"];

    expect(followEntryTags(selected, ["work", "home"])).toBe(selected);
  });
});
