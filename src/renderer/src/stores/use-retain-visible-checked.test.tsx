import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import { folderViewOf } from "@shared/folders/folder-view";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { useRetainVisibleChecked } from "./use-retain-visible-checked";

/**
 * 生成一个条目详情: 在论坛条目的基础上换编号, 名称与其它字段.
 * @param id 条目编号.
 * @param extra 要覆盖的其它字段.
 * @returns 条目详情.
 */
function entryOf(id: string, extra: Partial<EntryDetail> = {}): EntryDetail {
  return { ...FORUM_ENTRY, id, name: id.toUpperCase(), ...extra };
}

/**
 * 渲染 hook 并读取条目: a 与 b 在工作文件夹, c 没有所属文件夹.
 * @returns 测试环境.
 */
async function renderRetaining(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [
      entryOf("a", { folderId: "work" }),
      entryOf("b", { folderId: "work" }),
      entryOf("c"),
    ],
  });
  renderHook(() => useRetainVisibleChecked(), {
    wrapper: environment.Providers,
  });
  await act(() => environment.entryStore.getState().load());
  return environment;
}

/**
 * 读取批量选中里已勾选的条目编号.
 * @param environment 测试环境.
 * @returns 已勾选的条目编号, 已排序.
 */
function checkedIds(environment: EntryTestEnvironment): string[] {
  return [...environment.batchSelectionStore.getState().checkedIds].sort();
}

describe("useRetainVisibleChecked", () => {
  it("切换入口后取消不再可见的勾选, 仍可见的保留", async () => {
    const environment = await renderRetaining();
    act(() => {
      environment.batchSelectionStore.getState().toggle("a");
      environment.batchSelectionStore.getState().toggle("c");
    });

    act(() =>
      environment.entryStore.getState().selectView(folderViewOf("work")),
    );

    expect(checkedIds(environment)).toEqual(["a"]);
  });

  it("搜索结果到达后取消没有命中的条目的勾选", async () => {
    const environment = await renderRetaining();
    act(() => {
      environment.batchSelectionStore.getState().toggle("a");
      environment.batchSelectionStore.getState().toggle("b");
    });

    act(() => environment.entryStore.getState().setQuery("B"));
    await act(() => environment.entryStore.getState().search());

    expect(checkedIds(environment)).toEqual(["b"]);
  });

  it("条目被单个删除后取消它的勾选", async () => {
    const environment = await renderRetaining();
    act(() => {
      environment.batchSelectionStore.getState().toggle("a");
      environment.batchSelectionStore.getState().toggle("c");
    });

    await act(() => environment.entryStore.getState().remove("a"));

    expect(checkedIds(environment)).toEqual(["c"]);
  });

  it("可见列表没有变化时勾选保持不动", async () => {
    const environment = await renderRetaining();
    act(() => environment.batchSelectionStore.getState().toggle("a"));

    act(() => environment.entryStore.getState().setQuery(""));

    expect(checkedIds(environment)).toEqual(["a"]);
  });
});
