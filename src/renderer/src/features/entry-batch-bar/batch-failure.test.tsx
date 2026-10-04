import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { batchFailed } from "@shared/batch/batch-result";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  checkedIdsOf,
  checkEntries,
  renderWithLoadedStores,
} from "@renderer/testing/batch-test-helpers";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { EntryBatchBar } from "./entry-batch-bar";

/**
 * 家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "home", name: "家庭" }];

/**
 * 渲染选择栏, 勾选论坛与银行, 假批量桥的移入文件夹按给定的原因失败.
 * @param reason 失败原因.
 * @returns 渲染所用的环境.
 */
async function renderFailingMove(
  reason: Parameters<typeof batchFailed>[0],
): ReturnType<typeof renderWithLoadedStores> {
  const environment = await renderWithLoadedStores(<EntryBatchBar />, {
    entries: TEST_ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
    batchBridgeOverrides: {
      moveEntries: () => Promise.resolve(batchFailed(reason)),
    },
  });
  checkEntries(environment, ["forum", "bank"]);
  return environment;
}

/**
 * 通过移入文件夹菜单选 "家庭".
 */
async function moveToHome(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "移入文件夹" }));
  const menu = await screen.findByRole("menu");
  await user.click(within(menu).getByRole("menuitem", { name: "家庭" }));
}

describe("批量操作失败提示", () => {
  it("失败时在选择栏下方说明原因, 列表与勾选保持原样", async () => {
    const environment = await renderFailingMove("folder-not-found");

    await moveToHome();

    expect(
      await screen.findByText("目标文件夹已不存在, 操作没有执行."),
    ).toBeDefined();
    expect(checkedIdsOf(environment)).toEqual(["bank", "forum"]);
    expect(
      environment.entryStore
        .getState()
        .entries.every((entry) => entry.folderId === undefined),
    ).toBe(true);
  });

  it("不同的失败原因对应不同的说明", async () => {
    await renderFailingMove("tag-limit-exceeded");

    await moveToHome();

    expect(
      await screen.findByText("有条目已带满 10 个标签, 操作没有执行."),
    ).toBeDefined();
  });

  it("点关闭按钮收起提示, 再次执行时提示先清掉", async () => {
    await renderFailingMove("unexpected-error");
    await moveToHome();
    await screen.findByRole("alert");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "关闭提示" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
