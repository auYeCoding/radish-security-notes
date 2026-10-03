import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TagSummary } from "@shared/tags/tag-types";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { useSortedTags } from "./use-sorted-tags";

/**
 * 按创建先后排列的初始标签: 一个纯中文, 一个纯英文, 一个更长的纯中文.
 */
const TAGS: readonly TagSummary[] = [
  { id: "work", name: "工作账号", color: "blue" },
  { id: "mail", name: "Mail", color: "red" },
  { id: "home", name: "家庭", color: "green" },
];

/**
 * 渲染已排序标签 hook 之后, 测试用来读取与操作的东西.
 */
interface SortedTagsRendering {
  /**
   * 读取 hook 当前返回的标签名称, 按返回顺序.
   */
  readonly names: () => string[];
  /**
   * 渲染所用的测试环境.
   */
  readonly environment: EntryTestEnvironment;
}

/**
 * 在条目环境里渲染读取已排序标签的 hook, 并读取标签.
 * @param tags 初始标签, 按创建先后排列.
 * @returns 渲染结果的当前值读取方法与测试环境.
 */
async function renderSortedTags(
  tags: readonly TagSummary[],
): Promise<SortedTagsRendering> {
  const environment = await createEntryTestEnvironment({ tags });
  const rendered = renderHook(() => useSortedTags(), {
    wrapper: environment.Providers,
  });
  await act(() => environment.tagStore.getState().load());
  return {
    names: () => rendered.result.current.map((tag) => tag.name),
    environment,
  };
}

describe("useSortedTags", () => {
  it("读取后按名称排序规则排列, store 里仍是创建顺序", async () => {
    const { names, environment } = await renderSortedTags(TAGS);

    expect(names()).toEqual(["Mail", "家庭", "工作账号"]);
    expect(environment.tagStore.getState().tags.map((tag) => tag.name)).toEqual(
      ["工作账号", "Mail", "家庭"],
    );
  });

  it("新建后立即排到应在的位置", async () => {
    const { names, environment } = await renderSortedTags(TAGS);

    await act(() => environment.tagStore.getState().create("Bug", "blue"));

    expect(names()).toEqual(["Bug", "Mail", "家庭", "工作账号"]);
  });

  it("编辑名称后立即换到新名称应在的位置", async () => {
    const { names, environment } = await renderSortedTags(TAGS);

    await act(() =>
      environment.tagStore.getState().update("home", "A", "green"),
    );

    expect(names()).toEqual(["A", "Mail", "工作账号"]);
  });

  it("名称排序键相同的标签按创建先后排列, 编辑后仍按创建先后", async () => {
    const { names, environment } = await renderSortedTags([
      { id: "first", name: "Apple", color: "blue" },
      { id: "second", name: "Alpha", color: "red" },
    ]);
    expect(names()).toEqual(["Apple", "Alpha"]);

    await act(() =>
      environment.tagStore.getState().update("first", "Amber", "blue"),
    );

    expect(names()).toEqual(["Amber", "Alpha"]);
  });

  it("删除后立即移除", async () => {
    const { names, environment } = await renderSortedTags(TAGS);

    await act(() => environment.tagStore.getState().remove("mail"));

    expect(names()).toEqual(["家庭", "工作账号"]);
  });
});
