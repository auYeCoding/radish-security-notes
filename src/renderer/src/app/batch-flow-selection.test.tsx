import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { checkedIdsOf, checkRows } from "@renderer/testing/batch-test-helpers";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 办公文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "office", name: "办公" }];

/**
 * 论坛与银行在办公文件夹里, 维基没有所属文件夹.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "office" },
  { ...BANK_ENTRY, folderId: "office" },
  WIKI_ENTRY,
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与文件夹读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

describe("批量选中与左侧栏入口", () => {
  it("切换入口后取消不可见条目的勾选, 切回来也不会恢复", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    await checkRows(user, ["论坛", "维基"]);
    expect(screen.getByText("已选 2 项")).toBeDefined();

    await user.click(screen.getByRole("button", { name: /^办公\s*2$/ }));
    expect(checkedIdsOf(environment)).toEqual(["forum"]);
    expect(screen.getByText("已选 1 项")).toBeDefined();

    await user.click(screen.getByRole("button", { name: /^全部条目\s*3$/ }));
    expect(checkedIdsOf(environment)).toEqual(["forum"]);
  });

  it("全选只勾选当前入口里的条目", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^办公\s*2$/ }));

    await user.click(screen.getByRole("checkbox", { name: "全选" }));

    expect(checkedIdsOf(environment)).toEqual(["bank", "forum"]);
    expect(screen.getByText("已选 2 项")).toBeDefined();
  });
});

describe("批量选中与单击查看详情共存", () => {
  it("勾选条目时详情里仍是单击的条目, 勾选不会改变它", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /维基/ }));
    await screen.findByRole("heading", { name: "维基" });

    await checkRows(user, ["论坛", "银行"]);

    expect(screen.getByRole("heading", { name: "维基" })).toBeDefined();
    expect(screen.getByText("已选 2 项")).toBeDefined();
  });
});
