import { describe, expect, it } from "vitest";

import {
  ALL_ENTRIES_VIEW,
  UNCATEGORIZED_VIEW,
  folderViewOf,
} from "../folders/folder-view";
import type { EntrySummary } from "./entry-types";
import { selectVisibleEntries } from "./visible-entries";

/**
 * 构造一个测试用的条目摘要.
 * @param id 条目编号, 同时用作名称.
 * @param folderId 所属文件夹编号, 未分类时省略.
 * @param tagIds 带的标签编号, 没有标签时省略.
 * @returns 条目摘要.
 */
function summaryOf(
  id: string,
  folderId?: string,
  tagIds?: readonly string[],
): EntrySummary {
  return { id, name: id, type: "login", account: "", folderId, tagIds };
}

/**
 * 测试用的条目: 文件夹甲里两个, 一个带工作, 一个带工作与个人; 未分类里一个带工作, 一个没有标签.
 */
const ENTRIES: readonly EntrySummary[] = [
  summaryOf("a-work", "folder-a", ["work"]),
  summaryOf("a-both", "folder-a", ["work", "home"]),
  summaryOf("loose-work", undefined, ["work"]),
  summaryOf("loose-none"),
];

describe("selectVisibleEntries", () => {
  it("没有已选标签与关键字时只按入口取条目", () => {
    const all = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      tagIds: [],
      query: "",
    });

    expect(all).toEqual(ENTRIES);
  });

  it("标签与文件夹入口叠加取交集", () => {
    const result = selectVisibleEntries({
      entries: ENTRIES,
      view: folderViewOf("folder-a"),
      tagIds: ["work", "home"],
      query: "",
    });

    expect(result.map((entry) => entry.id)).toEqual(["a-both"]);
  });

  it("标签筛选在全部条目与未分类入口里同样生效", () => {
    const everywhere = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      tagIds: ["work"],
      query: "",
    });
    const loose = selectVisibleEntries({
      entries: ENTRIES,
      view: UNCATEGORIZED_VIEW,
      tagIds: ["work"],
      query: "",
    });

    expect(everywhere.map((entry) => entry.id)).toEqual([
      "a-work",
      "a-both",
      "loose-work",
    ]);
    expect(loose.map((entry) => entry.id)).toEqual(["loose-work"]);
  });

  it("搜索只在入口与标签筛出的条目里进行", () => {
    const result = selectVisibleEntries({
      entries: ENTRIES,
      view: ALL_ENTRIES_VIEW,
      tagIds: ["work"],
      query: "loose",
    });

    expect(result.map((entry) => entry.id)).toEqual(["loose-work"]);
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
      tagIds: [],
      query: "",
    });

    expect(result.map((entry) => entry.id)).toEqual([
      "Git",
      "Gap",
      "Gmail",
      "Gmail邮箱",
      "邮箱",
    ]);
  });

  it("入口, 标签与关键字筛出的条目也按名称排序", () => {
    const result = selectVisibleEntries({
      entries: [
        summaryOf("beta", "folder-a", ["work"]),
        summaryOf("alpha1", "folder-a", ["work"]),
        summaryOf("ab", "folder-a", ["work"]),
        summaryOf("ab-other", "folder-b", ["work"]),
      ],
      view: folderViewOf("folder-a"),
      tagIds: ["work"],
      query: "a",
    });

    expect(result.map((entry) => entry.id)).toEqual(["ab", "beta", "alpha1"]);
  });

  it("不修改传入的条目数组", () => {
    const entries = [summaryOf("b"), summaryOf("a")];

    selectVisibleEntries({
      entries,
      view: ALL_ENTRIES_VIEW,
      tagIds: [],
      query: "",
    });

    expect(entries.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
