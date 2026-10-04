import { describe, expect, it } from "vitest";

import type { EntrySummary } from "../entries/entry-types";
import { filterByMatches, toSearchMatches } from "./search-matches";

/**
 * 构造一个测试用的条目摘要.
 * @param id 条目编号, 同时用作名称.
 * @returns 条目摘要.
 */
function summaryOf(id: string): EntrySummary {
  return { id, name: id, type: "login", account: "" };
}

/**
 * 测试用的三个条目.
 */
const ENTRIES: readonly EntrySummary[] = [
  summaryOf("a"),
  summaryOf("b"),
  summaryOf("c"),
];

describe("toSearchMatches", () => {
  it("按条目编号记下命中字段", () => {
    const matches = toSearchMatches([
      { id: "a", fields: ["name"] },
      { id: "c", fields: ["notes", "tag"] },
    ]);

    expect(matches.get("a")).toEqual(["name"]);
    expect(matches.get("c")).toEqual(["notes", "tag"]);
    expect(matches.has("b")).toBe(false);
  });
});

describe("filterByMatches", () => {
  it("只留下命中表里有的条目, 保持原有顺序", () => {
    const matches = toSearchMatches([
      { id: "c", fields: ["name"] },
      { id: "a", fields: ["name"] },
    ]);

    expect(filterByMatches(ENTRIES, matches).map((entry) => entry.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("命中表里有但条目列表里已经没有的编号被忽略", () => {
    const matches = toSearchMatches([{ id: "gone", fields: ["name"] }]);

    expect(filterByMatches(ENTRIES, matches)).toEqual([]);
  });

  it("没有命中表时返回原数组, 不复制", () => {
    expect(filterByMatches(ENTRIES, undefined)).toBe(ENTRIES);
  });

  it("命中表为空时没有条目", () => {
    expect(filterByMatches(ENTRIES, toSearchMatches([]))).toEqual([]);
  });
});
