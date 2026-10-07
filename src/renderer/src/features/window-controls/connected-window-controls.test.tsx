import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { ConnectedWindowControls } from "./connected-window-controls";

/**
 * 在条目环境里渲染接上桥的窗口按钮组.
 * @param isMaximized 假桥读到的初始最大化状态.
 * @returns 渲染所用的环境.
 */
async function renderConnected(
  isMaximized = false,
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    windowControlsBridgeOverrides: {
      isMaximized: () => Promise.resolve(isMaximized),
    },
  });
  render(<ConnectedWindowControls />, { wrapper: environment.Providers });
  return environment;
}

describe("ConnectedWindowControls 按钮点击", () => {
  it("点击三个按钮分别请桥最小化, 切换最大化, 关闭", async () => {
    const { windowControlsBridge } = await renderConnected();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "最小化" }));
    await user.click(screen.getByRole("button", { name: "最大化" }));
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(windowControlsBridge.minimize).toHaveBeenCalledOnce();
    expect(windowControlsBridge.toggleMaximize).toHaveBeenCalledOnce();
    expect(windowControlsBridge.close).toHaveBeenCalledOnce();
  });
});

describe("ConnectedWindowControls 最大化状态", () => {
  it("窗口一开始已最大化时第二个按钮就是还原", async () => {
    await renderConnected(true);

    expect(await screen.findByRole("button", { name: "还原" })).toBeDefined();
  });

  it("主进程推送最大化后第二个按钮变为还原, 推送还原后变回最大化", async () => {
    const { windowControlsBridge } = await renderConnected();
    await waitFor(() =>
      expect(windowControlsBridge.getListenerCount()).toBe(1),
    );

    act(() => windowControlsBridge.emitMaximizedChange(true));
    expect(screen.getByRole("button", { name: "还原" })).toBeDefined();
    act(() => windowControlsBridge.emitMaximizedChange(false));

    expect(screen.getByRole("button", { name: "最大化" })).toBeDefined();
  });
});
