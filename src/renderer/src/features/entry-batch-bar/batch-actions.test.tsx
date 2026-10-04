import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";
import {
  checkedIdsOf,
  checkEntries,
  renderWithLoadedStores,
} from "@renderer/testing/batch-test-helpers";
import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";

import { EntryBatchBar } from "./entry-batch-bar";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛带重要与工作标签, 银行带工作标签, 维基没有标签, 都未分类.
 */
const TAGGED_ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, tagIds: ["work-tag"] },
  WIKI_ENTRY,
];

/**
 * 渲染选择栏, 带文件夹, 标签与带标签的条目, 并勾选论坛与银行.
 * @param overrides 覆盖条目环境的选项, 例如假批量桥上的方法.
 * @returns 渲染所用的环境.
 */
async function renderWithTwoChecked(
  overrides: EntryTestEnvironmentOptions = {},
): ReturnType<typeof renderWithLoadedStores> {
  const environment = await renderWithLoadedStores(<EntryBatchBar />, {
    entries: TAGGED_ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
    ...overrides,
  });
  checkEntries(environment, ["forum", "bank"]);
  return environment;
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

describe("批量移入文件夹", () => {
  it("点菜单里的文件夹把勾选的条目都放进去, 列表里的所属更新, 勾选清空", async () => {
    const environment = await renderWithTwoChecked();

    await chooseBatchMenuItem("移入文件夹", "家庭");

    await waitFor(() => expect(checkedIdsOf(environment)).toEqual([]));
    expect(environment.batchBridge.moveEntries).toHaveBeenCalledWith(
      ["forum", "bank"],
      "home",
    );
    expect(
      environment.entryStore
        .getState()
        .entries.map((entry) => [entry.id, entry.folderId]),
    ).toEqual([
      ["forum", "home"],
      ["bank", "home"],
      ["wiki", undefined],
    ]);
  });

  it("点未分类把条目移回未分类", async () => {
    const environment = await renderWithTwoChecked();

    await chooseBatchMenuItem("移入文件夹", "未分类");

    await waitFor(() =>
      expect(environment.batchBridge.moveEntries).toHaveBeenCalledWith(
        ["forum", "bank"],
        undefined,
      ),
    );
  });
});

describe("批量加标签与摘标签", () => {
  it("加标签后勾选的条目都带上它, 已带的保持不变", async () => {
    const environment = await renderWithTwoChecked();

    await chooseBatchMenuItem("加标签", "个人");

    await waitFor(() => expect(checkedIdsOf(environment)).toEqual([]));
    expect(environment.batchBridge.addTag).toHaveBeenCalledWith(
      ["forum", "bank"],
      "personal-tag",
    );
    expect(
      environment.entryStore.getState().entries.map((entry) => entry.tagIds),
    ).toEqual([
      ["important", "work-tag", "personal-tag"],
      ["work-tag", "personal-tag"],
      undefined,
    ]);
  });

  it("摘标签后勾选的条目不再带它, 没带它的条目不受影响", async () => {
    const environment = await renderWithTwoChecked();

    await chooseBatchMenuItem("摘标签", "重要");

    await waitFor(() => expect(checkedIdsOf(environment)).toEqual([]));
    expect(environment.batchBridge.removeTag).toHaveBeenCalledWith(
      ["forum", "bank"],
      "important",
    );
    expect(
      environment.entryStore.getState().entries.map((entry) => entry.tagIds),
    ).toEqual([["work-tag"], ["work-tag"], undefined]);
  });
});
