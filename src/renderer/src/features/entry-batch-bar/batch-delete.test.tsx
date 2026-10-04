import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { batchFailed } from "@shared/batch/batch-result";

import {
  checkedIdsOf,
  checkEntries,
  renderWithLoadedStores,
} from "@renderer/testing/batch-test-helpers";
import { TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import type { EntryTestEnvironmentOptions } from "@renderer/testing/entry-test-environment";

import { EntryBatchBar } from "./entry-batch-bar";

/**
 * 渲染选择栏并勾选论坛与银行.
 * @param overrides 覆盖条目环境的选项, 例如假批量桥上的方法.
 * @returns 渲染所用的环境.
 */
async function renderWithTwoChecked(
  overrides: EntryTestEnvironmentOptions = {},
): ReturnType<typeof renderWithLoadedStores> {
  const environment = await renderWithLoadedStores(<EntryBatchBar />, {
    entries: TEST_ENTRIES,
    ...overrides,
  });
  checkEntries(environment, ["forum", "bank"]);
  return environment;
}

/**
 * 点批量删除按钮, 等确认框出现.
 * @returns 确认框元素.
 */
async function openDeleteDialog(): Promise<HTMLElement> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "删除选中的条目" }));
  return screen.findByRole("alertdialog");
}

describe("批量删除确认", () => {
  it("点删除入口只弹出确认框, 写明条目数与无法恢复, 不调用桥", async () => {
    const { batchBridge } = await renderWithTwoChecked();

    const dialog = await openDeleteDialog();

    expect(within(dialog).getByText("删除选中的条目?")).toBeDefined();
    expect(
      within(dialog).getByText("选中的 2 个条目将被永久删除, 无法恢复."),
    ).toBeDefined();
    expect(batchBridge.removeEntries).not.toHaveBeenCalled();
  });

  it("点取消或按 Esc 关闭确认框, 条目与勾选都保留", async () => {
    const environment = await renderWithTwoChecked();
    const user = userEvent.setup();
    const dialog = await openDeleteDialog();

    await user.click(within(dialog).getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await openDeleteDialog();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.batchBridge.removeEntries).not.toHaveBeenCalled();
    expect(checkedIdsOf(environment)).toEqual(["bank", "forum"]);
    expect(environment.entryStore.getState().entries).toHaveLength(3);
  });
});

describe("批量删除执行", () => {
  it("点删除后一次删除勾选的条目, 列表移除它们, 确认框关闭, 勾选清空", async () => {
    const environment = await renderWithTwoChecked();
    const dialog = await openDeleteDialog();

    await userEvent
      .setup()
      .click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(environment.batchBridge.removeEntries).toHaveBeenCalledWith([
      "forum",
      "bank",
    ]);
    expect(
      environment.entryStore.getState().entries.map((entry) => entry.id),
    ).toEqual(["wiki"]);
    expect(checkedIdsOf(environment)).toEqual([]);
  });

  it("删除失败时确认框保持打开并说明原因, 条目与勾选不变", async () => {
    const environment = await renderWithTwoChecked({
      batchBridgeOverrides: {
        removeEntries: () => Promise.resolve(batchFailed("unexpected-error")),
      },
    });
    const dialog = await openDeleteDialog();

    await userEvent
      .setup()
      .click(within(dialog).getByRole("button", { name: "删除" }));

    expect(
      await within(dialog).findByText(/操作失败, 没有任何改动/),
    ).toBeDefined();
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(environment.entryStore.getState().entries).toHaveLength(3);
    expect(checkedIdsOf(environment)).toEqual(["bank", "forum"]);
  });
});
