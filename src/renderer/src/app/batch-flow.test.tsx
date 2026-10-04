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
import { checkedIdsOf, checkRows } from "@renderer/testing/batch-test-helpers";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 办公文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "office", name: "办公" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在办公文件夹里, 维基未分类, 论坛带重要与工作标签, 银行带工作标签.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "office", tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, folderId: "office", tagIds: ["work-tag"] },
  WIKI_ENTRY,
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
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 按名称与条目数取侧栏的一行入口按钮, 按钮的名称形如 "办公 2".
 * @param label 入口名称.
 * @param count 入口里的条目数.
 * @returns 入口按钮元素.
 */
function navButton(label: string, count: number): HTMLElement {
  return screen.getByRole("button", {
    name: new RegExp(`^${label}\\s*${count}$`),
  });
}

/**
 * 打开批量操作栏里的一个菜单, 点其中一项.
 * @param menuName 菜单按钮的名称.
 * @param itemName 菜单项的名称.
 */
async function chooseBatchMenuItem(
  menuName: string,
  itemName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: menuName }));
  const menu = await screen.findByRole("menu");
  await user.click(within(menu).getByRole("menuitem", { name: itemName }));
}

describe("批量移入文件夹与加标签", () => {
  it("勾选条目移入文件夹后侧栏计数即时更新, 列表条目数不变, 勾选清空", async () => {
    const environment = await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "维基"]);

    await chooseBatchMenuItem("移入文件夹", "家庭");

    expect(
      await screen.findByRole("button", { name: /^家庭\s*2$/ }),
    ).toBeDefined();
    expect(navButton("办公", 1)).toBeDefined();
    expect(navButton("未分类", 0)).toBeDefined();
    expect(getEntryListItems()).toHaveLength(3);
    expect(checkedIdsOf(environment)).toEqual([]);
    expect(screen.getByText("全选")).toBeDefined();
  });

  it("批量加标签后侧栏的标签计数即时更新", async () => {
    await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "银行"]);

    await chooseBatchMenuItem("加标签", "个人");

    expect(
      await screen.findByRole("button", { name: /^个人\s*2$/ }),
    ).toBeDefined();
    expect(navButton("工作", 2)).toBeDefined();
  });
});

describe("批量摘标签与删除", () => {
  it("批量摘标签后侧栏的标签计数即时更新", async () => {
    await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "银行"]);

    await chooseBatchMenuItem("摘标签", "工作");

    expect(
      await screen.findByRole("button", { name: /^工作\s*0$/ }),
    ).toBeDefined();
    expect(navButton("重要", 1)).toBeDefined();
  });

  it("批量删除后侧栏计数更新, 详情里的条目被删时选中相邻条目", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /论坛/ }));
    await screen.findByRole("heading", { name: "论坛" });
    await checkRows(user, ["论坛", "银行"]);

    await user.click(screen.getByRole("button", { name: "删除选中的条目" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => expect(getEntryListItems()).toHaveLength(1));
    expect(await screen.findByRole("heading", { name: "维基" })).toBeDefined();
    expect(navButton("全部条目", 1)).toBeDefined();
    expect(navButton("办公", 0)).toBeDefined();
  });
});
