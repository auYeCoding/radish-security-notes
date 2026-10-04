import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { useDragSource } from "@renderer/lib/drag-drop/use-drag-source";
import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WALLET_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { UnlockedWorkspace } from "./unlocked-workspace";

vi.mock("@renderer/lib/drag-drop/use-drag-source", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@renderer/lib/drag-drop/use-drag-source")
    >();
  return { ...original, useDragSource: vi.fn(original.useDragSource) };
});

/**
 * 渲染带四个条目的解锁后工作区, 等条目读取完成.
 */
async function renderWorkspace(): Promise<void> {
  const environment = await createEntryTestEnvironment({
    entries: [FORUM_ENTRY, BANK_ENTRY, WIKI_ENTRY, WALLET_ENTRY],
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
  });
  await screen.findByRole("checkbox", { name: "选择条目 论坛" });
}

describe("勾选的渲染开销", () => {
  it("勾选一行时只有这一行重新渲染, 不会连带整张列表的拖拽源", async () => {
    await renderWorkspace();
    const renderCalls = vi.mocked(useDragSource);
    renderCalls.mockClear();

    await userEvent
      .setup()
      .click(screen.getByRole("checkbox", { name: "选择条目 银行" }));

    expect(screen.getByText("已选 1 项")).toBeDefined();
    expect(renderCalls.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("全选时每一行重新渲染一次, 取消全选同理", async () => {
    await renderWorkspace();
    const renderCalls = vi.mocked(useDragSource);
    const user = userEvent.setup();
    renderCalls.mockClear();

    await user.click(screen.getByRole("checkbox", { name: "全选" }));

    expect(renderCalls.mock.calls.length).toBe(4);
  });
});
