import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "home", name: "家庭" }];

/**
 * 论坛在家庭文件夹里, 带重要与工作标签; 银行在家庭文件夹里, 带工作标签; 维基没有所属文件夹, 带个人标签.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "home", tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, folderId: "home", tagIds: ["work-tag"] },
  { ...WIKI_ENTRY, tagIds: ["personal-tag"] },
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 取列表里每个条目的名称.
 * @returns 名称数组, 按列表顺序.
 */
function listedNames(): string[] {
  return getEntryListItems().map((item) => item.textContent ?? "");
}

describe("侧栏不再列出标签", () => {
  it("侧栏只有文件夹分区: 没有标签标题, 标签行与新建标签按钮", async () => {
    await renderWorkspace();
    const sidebar = screen.getByRole("complementary");

    expect(
      within(sidebar).getByRole("heading", { name: "文件夹" }),
    ).toBeDefined();
    expect(within(sidebar).queryByRole("heading", { name: "标签" })).toBeNull();
    expect(
      within(sidebar).queryByRole("button", { name: /^(重要|工作|个人)/ }),
    ).toBeNull();
    expect(
      within(sidebar).queryByRole("button", { name: "新建标签" }),
    ).toBeNull();
  });

  it("没有标签时侧栏也没有 还没有标签 的说明", async () => {
    const environment = await createEntryTestEnvironment({
      entries: ENTRIES,
      tags: [],
    });
    render(<UnlockedWorkspace />, { wrapper: environment.Providers });
    await waitFor(() => {
      expect(environment.tagStore.getState().loadStatus).toBe("ready");
    });

    expect(
      within(screen.getByRole("complementary")).queryByText("还没有标签"),
    ).toBeNull();
  });
});

describe("按标签找条目靠搜索", () => {
  it("在搜索框输入标签名, 列表只留下带这个标签的条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    expect(getEntryListItems()).toHaveLength(3);

    await user.type(screen.getByPlaceholderText("搜索条目"), "个人");

    await waitFor(() => expect(listedNames()).toHaveLength(1));
    expect(listedNames()[0]).toContain("维基");
  });
});

describe("详情里的标签", () => {
  it("详情里显示选中条目带的标签徽章", async () => {
    await renderWorkspace();
    const user = userEvent.setup();

    await user.click(
      getEntryListItems()[0]?.querySelector("button") as Element,
    );

    const badges = await screen.findByRole("list", { name: "标签" });
    expect(
      within(badges)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["重要", "工作"]);
  });
});
