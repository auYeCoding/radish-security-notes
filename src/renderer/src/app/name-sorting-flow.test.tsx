import { act, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  EntryDetail,
  NewEntryInput,
  UpdateEntryInput,
} from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";
import type { TagSummary } from "@shared/tags/tag-types";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 按最新创建在前排列的四个条目: 纯中文长名, 纯英文, 纯中文短名, 数字开头的中英混杂.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, id: "mail", name: "邮箱账号" },
  { ...FORUM_ENTRY, id: "gmail", name: "Gmail" },
  { ...FORUM_ENTRY, id: "bank", name: "银行" },
  { ...FORUM_ENTRY, id: "machine", name: "1号机" },
];

/**
 * 按创建先后排列的三个文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "folder-mail", name: "邮箱账号" },
  { id: "folder-gmail", name: "Gmail" },
  { id: "folder-bank", name: "银行" },
];

/**
 * 按创建先后排列的三个标签.
 */
const TAGS: readonly TagSummary[] = [
  { id: "tag-important", name: "重要事项", color: "red" },
  { id: "tag-work", name: "Work", color: "blue" },
  { id: "tag-personal", name: "个人", color: "green" },
];

/**
 * 把条目改名的更新输入.
 * @param name 新名称.
 * @returns 更新输入.
 */
function renameInput(name: string): UpdateEntryInput {
  return {
    name,
    fields: { account: "forum-account", password: "forum-password", url: "" },
    notes: "",
    customFields: [],
    totp: "",
    removeTotp: false,
  };
}

/**
 * 新建一个通用登录条目的输入.
 * @param name 条目名称.
 * @returns 新建输入.
 */
function newEntryInput(name: string): NewEntryInput {
  return {
    type: "login",
    name,
    fields: { account: "new-account", password: "new-password", url: "" },
    notes: "",
    customFields: [],
    totp: "",
  };
}

/**
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
    tags: TAGS,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 按界面从上到下的顺序取出侧栏里的文件夹名称或标签名称.
 * @param names 要挑出的名称集合.
 * @returns 这些名称在侧栏里的先后.
 */
function sidebarOrder(names: readonly string[]): string[] {
  const pattern = new RegExp(`^(${names.join("|")})\\s*\\d+$`);
  return screen
    .getAllByRole("button")
    .map((button) => pattern.exec(button.textContent ?? "")?.[1])
    .filter((name): name is string => name !== undefined);
}

/**
 * 取中间列表里每个条目项的名称.
 * @returns 条目名称列表.
 */
function listedNames(): string[] {
  return getEntryListItems().map(
    (item) => within(item).getAllByText(/\S/)[0]?.textContent ?? "",
  );
}

describe("名称排序规则在三处的应用", () => {
  it("条目列表, 侧栏文件夹与侧栏标签都按名称排序规则排列", async () => {
    await renderWorkspace();

    expect(listedNames()).toEqual(["Gmail", "1号机", "银行", "邮箱账号"]);
    expect(sidebarOrder(FOLDERS.map((folder) => folder.name))).toEqual([
      "Gmail",
      "银行",
      "邮箱账号",
    ]);
    expect(sidebarOrder(TAGS.map((tag) => tag.name))).toEqual([
      "Work",
      "个人",
      "重要事项",
    ]);
  });

  it("新建条目后列表立即把它排到应在的位置", async () => {
    const environment = await renderWorkspace();

    await act(() =>
      environment.entryStore.getState().create(newEntryInput("Git")),
    );

    expect(listedNames()).toEqual([
      "Git",
      "Gmail",
      "1号机",
      "银行",
      "邮箱账号",
    ]);
  });

  it("编辑条目名称后列表立即换位置", async () => {
    const environment = await renderWorkspace();

    await act(() =>
      environment.entryStore.getState().update("bank", renameInput("A")),
    );

    expect(listedNames()).toEqual(["A", "Gmail", "1号机", "邮箱账号"]);
  });
});

describe("名称排序规则在侧栏的即时更新", () => {
  it("新建与重命名文件夹后侧栏立即换位置", async () => {
    const environment = await renderWorkspace();
    const names = FOLDERS.map((folder) => folder.name).concat(["Git", "Z"]);

    await act(() => environment.folderStore.getState().create("Git"));
    expect(sidebarOrder(names)).toEqual(["Git", "Gmail", "银行", "邮箱账号"]);
    await act(() =>
      environment.folderStore.getState().rename("folder-bank", "Z"),
    );

    expect(sidebarOrder(names)).toEqual(["Z", "Git", "Gmail", "邮箱账号"]);
  });

  it("新建与编辑标签后侧栏立即换位置", async () => {
    const environment = await renderWorkspace();
    const names = TAGS.map((tag) => tag.name).concat(["A", "Git"]);

    await act(() => environment.tagStore.getState().create("Git", "slate"));
    expect(sidebarOrder(names)).toEqual(["Git", "Work", "个人", "重要事项"]);
    await act(() =>
      environment.tagStore.getState().update("tag-personal", "A", "green"),
    );

    expect(sidebarOrder(names)).toEqual(["A", "Git", "Work", "重要事项"]);
  });
});
