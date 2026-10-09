import { describe, expect, it } from "vitest";

import { ALL_ENTRIES_VIEW, folderViewOf } from "../folders/folder-view";
import { toSearchMatches } from "../search/search-matches";
import type { EntrySummary } from "./entry-types";
import { selectVisibleEntries } from "./visible-entries";

/**
 * 构造一个测试用的条目摘要.
 * @param id 条目编号, 同时用作名称.
 * @param folderId 所属文件夹编号, 没有所属文件夹时省略.
 * @returns 条目摘要.
 */
function summaryOf(id: string, folderId?: string): EntrySummary {
  return { id, name: id, type: "login", account: "", folderId };
}

/**
 * 为一组条目编号生成命中表, 命中字段都是名称.
 * @param ids 命中的条目编号.
 * @returns 命中表.
 */
function matchesOf(...ids: string[]): ReturnType<typeof toSearchMatches> {
  return toSearchMatches(ids.map((id) => ({ id, fields: ["name"] })));
}

/**
 * 测试用的条目: 文件夹甲里两个, 没有所属文件夹的两个.
 */
const ENTRIES: readonly EntrySummary[] = [
  summaryOf("a-first", "folder-a"),
  summaryOf("a-second", "folder-a"),
  summaryOf("loose-first"),
  summaryOf("loose-second"),
];

describe("selectVisibleEntries", () => {
  it("没有搜索命中表时只按入口取条目", () => {
    const all = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      matches: undefined,
    });

    expect(all).toEqual(ENTRIES);
  });

  it("全部条目含没有所属文件夹的条目, 文件夹入口只含它里面的条目", () => {
    const everywhere = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      matches: undefined,
    });
    const inFolder = selectVisibleEntries({
      entries: ENTRIES,
      view: folderViewOf("folder-a"),
      matches: undefined,
    });

    expect(everywhere.map((entry) => entry.id)).toEqual([
      "a-first",
      "a-second",
      "loose-first",
      "loose-second",
    ]);
    expect(inFolder.map((entry) => entry.id)).toEqual(["a-first", "a-second"]);
  });
});

describe("selectVisibleEntries 的搜索命中表", () => {
  it("搜索只在入口筛出的条目里进行", () => {
    const result = selectVisibleEntries({
      entries: ENTRIES,
      view: folderViewOf("folder-a"),
      matches: matchesOf("a-first", "loose-first"),
    });

    expect(result.map((entry) => entry.id)).toEqual(["a-first"]);
  });

  it("命中表为空时没有可见条目", () => {
    const result = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      matches: matchesOf(),
    });

    expect(result).toEqual([]);
  });
});

describe("selectVisibleEntries 的名称排序", () => {
  it("可见条目按名称排序规则排序, 排序键相同的保持传入的先后", () => {
    const result = selectVisibleEntries({
      entries: [
        summaryOf("邮箱"),
        summaryOf("Gmail邮箱"),
        summaryOf("Gmail"),
        summaryOf("Git"),
        summaryOf("Gap"),
      ],
      view: ALL_ENTRIES_VIEW,
      matches: undefined,
    });

    expect(result.map((entry) => entry.id)).toEqual([
      "Git",
      "Gap",
      "Gmail",
      "Gmail邮箱",
      "邮箱",
    ]);
  });

  it("入口与搜索命中筛出的条目也按名称排序", () => {
    const result = selectVisibleEntries({
      entries: [
        summaryOf("beta", "folder-a"),
        summaryOf("alpha1", "folder-a"),
        summaryOf("ab", "folder-a"),
        summaryOf("ab-other", "folder-b"),
      ],
      view: folderViewOf("folder-a"),
      matches: matchesOf("beta", "alpha1", "ab", "ab-other"),
    });

    expect(result.map((entry) => entry.id)).toEqual(["ab", "beta", "alpha1"]);
  });

  it("不修改传入的条目数组", () => {
    const entries = [summaryOf("b"), summaryOf("a")];

    selectVisibleEntries({
      entries,
      view: ALL_ENTRIES_VIEW,
      matches: undefined,
    });

    expect(entries.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
