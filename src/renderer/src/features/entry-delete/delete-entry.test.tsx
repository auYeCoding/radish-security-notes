import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { entryFailed } from "@shared/entries/entry-result";

import { TEST_ENTRIES, WALLET_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";

import { DeleteEntryTrigger } from "./delete-entry-trigger";

/**
 * 渲染删除入口, 条目环境里有要删除的条目, 列表已读取且该条目已选中.
 * @param options 条目环境的选项.
 * @returns 渲染所用的环境.
 */
async function renderTrigger(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: [WALLET_ENTRY],
    ...options,
  });
  await environment.entryStore.getState().load();
  await environment.entryStore.getState().select(WALLET_ENTRY.id);
  render(<DeleteEntryTrigger detail={WALLET_ENTRY} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

/**
 * 点击删除入口, 等确认框出现.
 */
async function openConfirmDialog(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "删除条目" }));
  await screen.findByRole("alertdialog");
}

describe("删除确认", () => {
  it("点删除入口只弹出确认框, 写明条目名称, 不调用桥", async () => {
    const { entryBridge } = await renderTrigger();

    await openConfirmDialog();

    expect(screen.getByText("删除这个条目?")).toBeDefined();
    expect(screen.getByText(/"钱包" 将被永久删除/)).toBeDefined();
    expect(entryBridge.remove).not.toHaveBeenCalled();
  });

  it("点取消关闭确认框, 条目保留", async () => {
    const { entryBridge, entryStore } = await renderTrigger();
    await openConfirmDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "取消" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(entryBridge.remove).not.toHaveBeenCalled();
    expect(entryStore.getState().entries).toHaveLength(1);
  });

  it("按 Esc 关闭确认框, 条目保留", async () => {
    const { entryBridge } = await renderTrigger();
    await openConfirmDialog();

    await userEvent.setup().keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(entryBridge.remove).not.toHaveBeenCalled();
  });
});

describe("删除执行", () => {
  it("点删除后调用桥, 条目从列表移除, 确认框关闭", async () => {
    const { entryBridge, entryStore } = await renderTrigger();
    await openConfirmDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(entryBridge.remove).toHaveBeenCalledWith("wallet");
    expect(entryStore.getState().entries).toEqual([]);
    expect(entryStore.getState().selection).toEqual({ status: "none" });
  });
});

describe("删除失败", () => {
  it("条目已不存在时显示原因, 确认框保留", async () => {
    await renderTrigger({
      entryBridgeOverrides: {
        remove: () => Promise.resolve(entryFailed("not-found")),
      },
    });
    await openConfirmDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    expect(await screen.findByText("这个条目已不存在.")).toBeDefined();
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("接口抛出错误时显示删除失败, 按钮恢复可用", async () => {
    await renderTrigger({
      entryBridgeOverrides: { remove: () => Promise.reject(new Error("ipc")) },
    });
    await openConfirmDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    expect(
      await screen.findByText("删除失败. 请关闭应用后重试."),
    ).toBeDefined();
    expect(
      (screen.getByRole("button", { name: "删除" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("多个条目里只删除所选的一个", async () => {
    const environment = await createEntryTestEnvironment({
      entries: TEST_ENTRIES,
    });
    await environment.entryStore.getState().load();
    render(<DeleteEntryTrigger detail={TEST_ENTRIES[1] ?? WALLET_ENTRY} />, {
      wrapper: environment.Providers,
    });
    await openConfirmDialog();

    await userEvent.setup().click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() =>
      expect(
        environment.entryStore.getState().entries.map((entry) => entry.id),
      ).toEqual(["forum", "wiki"]),
    );
  });
});
