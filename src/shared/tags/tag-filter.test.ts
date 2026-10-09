import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import {
  countEntriesWithTag,
  entryTagIdsOf,
  tagIdsOrOmitted,
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

  it("tagIdsOrOmitted 没有标签时省略, 有标签时原样返回", () => {
    const tagIds = ["work"];

    expect(tagIdsOrOmitted([])).toBeUndefined();
    expect(tagIdsOrOmitted(tagIds)).toBe(tagIds);
  });

  it("countEntriesWithTag 统计带某个标签的条目总数", () => {
    expect(countEntriesWithTag(ENTRIES, "work")).toBe(2);
    expect(countEntriesWithTag(ENTRIES, "home")).toBe(2);
    expect(countEntriesWithTag(ENTRIES, "unknown")).toBe(0);
  });
});

describe("标签编号的变化", () => {
  it("withoutTagId 去掉一个标签, 本来就没有它时返回原数组", () => {
    const tagIds = ["work", "home"];

    expect(withoutTagId(tagIds, "work")).toEqual(["home"]);
    expect(withoutTagId(tagIds, "other")).toBe(tagIds);
  });
});
