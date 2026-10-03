import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FolderSummary } from "@shared/folders/folder-types";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { useSortedFolders } from "./use-sorted-folders";

/**
 * 按创建先后排列的初始文件夹: 一个纯中文, 一个纯英文, 一个更长的纯中文.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "bank", name: "银行" },
  { id: "mail", name: "Gmail" },
  { id: "account", name: "邮箱账号" },
];

/**
 * 渲染已排序文件夹 hook 之后, 测试用来读取与操作的东西.
 */
interface SortedFoldersRendering {
  /**
   * 读取 hook 当前返回的文件夹名称, 按返回顺序.
   */
  readonly names: () => string[];
  /**
   * 渲染所用的测试环境.
   */
  readonly environment: EntryTestEnvironment;
}

/**
 * 在条目环境里渲染读取已排序文件夹的 hook, 并读取文件夹.
 * @param folders 初始文件夹, 按创建先后排列.
 * @returns 渲染结果的当前值读取方法与测试环境.
 */
async function renderSortedFolders(
  folders: readonly FolderSummary[],
): Promise<SortedFoldersRendering> {
  const environment = await createEntryTestEnvironment({ folders });
  const rendered = renderHook(() => useSortedFolders(), {
    wrapper: environment.Providers,
  });
  await act(() => environment.folderStore.getState().load());
  return {
    names: () => rendered.result.current.map((folder) => folder.name),
    environment,
  };
}

describe("useSortedFolders", () => {
  it("读取后按名称排序规则排列, store 里仍是创建顺序", async () => {
    const { names, environment } = await renderSortedFolders(FOLDERS);

    expect(names()).toEqual(["Gmail", "银行", "邮箱账号"]);
    expect(
      environment.folderStore.getState().folders.map((folder) => folder.name),
    ).toEqual(["银行", "Gmail", "邮箱账号"]);
  });

  it("新建后立即排到应在的位置", async () => {
    const { names, environment } = await renderSortedFolders(FOLDERS);

    await act(() => environment.folderStore.getState().create("Git"));

    expect(names()).toEqual(["Git", "Gmail", "银行", "邮箱账号"]);
  });

  it("重命名后立即换到新名称应在的位置", async () => {
    const { names, environment } = await renderSortedFolders(FOLDERS);

    await act(() => environment.folderStore.getState().rename("bank", "Z"));

    expect(names()).toEqual(["Z", "Gmail", "邮箱账号"]);
  });

  it("名称排序键相同的文件夹按创建先后排列, 重命名后仍按创建先后", async () => {
    const { names, environment } = await renderSortedFolders([
      { id: "first", name: "Apple" },
      { id: "second", name: "Alpha" },
    ]);
    expect(names()).toEqual(["Apple", "Alpha"]);

    await act(() =>
      environment.folderStore.getState().rename("first", "Amber"),
    );

    expect(names()).toEqual(["Amber", "Alpha"]);
  });

  it("删除后立即移除", async () => {
    const { names, environment } = await renderSortedFolders(FOLDERS);

    await act(() => environment.folderStore.getState().remove("mail"));

    expect(names()).toEqual(["银行", "邮箱账号"]);
  });
});
