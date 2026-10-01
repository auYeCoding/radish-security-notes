import { describe, expect, it } from "vitest";

import type { EntrySummary } from "./entry-types";
import { filterEntries } from "./filter-entries";

/**
 * 测试用的三个条目摘要.
 */
const ENTRIES: readonly EntrySummary[] = [
  { id: "1", name: "Alpha Forum", account: "alice@example.com" },
  { id: "2", name: "Beta Bank", account: "bob-account" },
  { id: "3", name: "银行卡", account: "bank-card-user" },
];

/**
 * 取出过滤结果的编号.
 * @param query 关键字.
 * @returns 匹配条目的编号.
 */
function matchedIds(query: string): string[] {
  return filterEntries(ENTRIES, query).map((entry) => entry.id);
}

describe("filterEntries", () => {
  it("关键字为空或只有空格时返回全部条目", () => {
    expect(matchedIds("")).toEqual(["1", "2", "3"]);
    expect(matchedIds("   ")).toEqual(["1", "2", "3"]);
  });

  it("按名称匹配, 不区分大小写", () => {
    expect(matchedIds("beta")).toEqual(["2"]);
    expect(matchedIds("FORUM")).toEqual(["1"]);
  });

  it("按账号匹配, 不区分大小写", () => {
    expect(matchedIds("ALICE@")).toEqual(["1"]);
    expect(matchedIds("bob-acc")).toEqual(["2"]);
  });

  it("名称或账号任一匹配即留下, 保持原有顺序", () => {
    expect(matchedIds("bank")).toEqual(["2", "3"]);
  });

  it("关键字去首尾空格, 支持中文", () => {
    expect(matchedIds("  银行  ")).toEqual(["3"]);
  });

  it("没有匹配时返回空列表", () => {
    expect(matchedIds("not-found")).toEqual([]);
  });

  it("关键字为空时返回原数组, 不复制", () => {
    expect(filterEntries(ENTRIES, "")).toBe(ENTRIES);
  });
});
