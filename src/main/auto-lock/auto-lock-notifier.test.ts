import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import {
  createAutoLockNotifier,
  type AutoLockNotifierWindow,
} from "./auto-lock-notifier";

/**
 * 覆盖假主窗口行为的选项.
 */
interface WindowOverrides {
  /**
   * 窗口是否已销毁.
   */
  readonly isDestroyed?: boolean;
  /**
   * 推送时是否抛错.
   */
  readonly shouldThrow?: boolean;
}

/**
 * 假主窗口与它的页面推送间谍.
 */
interface FakeWindow {
  /**
   * 交给通知函数的主窗口.
   */
  readonly window: AutoLockNotifierWindow;
  /**
   * 页面推送间谍.
   */
  readonly send: ReturnType<typeof vi.fn>;
}

/**
 * 创建假主窗口.
 * @param overrides 覆盖假窗口的行为.
 * @returns 假窗口与推送间谍.
 */
function createWindow(overrides: WindowOverrides = {}): FakeWindow {
  const send = vi.fn(() => {
    if (overrides.shouldThrow === true) {
      throw new Error("推送失败");
    }
  });
  return {
    send,
    window: {
      webContents: { send },
      isDestroyed: () => overrides.isDestroyed === true,
    },
  };
}

describe("createAutoLockNotifier", () => {
  it.each(["idle", "screen-lock", "sleep"] as const)(
    "把原因 %s 推送到主窗口页面的自动锁定通道",
    (reason) => {
      const { window, send } = createWindow();

      createAutoLockNotifier({ get: () => window })(reason);

      expect(send).toHaveBeenCalledWith(IPC_CHANNELS.vaultAutoLocked, reason);
    },
  );

  it("还没有主窗口时什么也不做", () => {
    expect(() =>
      createAutoLockNotifier({ get: () => undefined })("idle"),
    ).not.toThrow();
  });

  it("窗口已销毁时不推送", () => {
    const { window, send } = createWindow({ isDestroyed: true });

    createAutoLockNotifier({ get: () => window })("idle");

    expect(send).not.toHaveBeenCalled();
  });

  it("推送抛错时不外泄", () => {
    const { window } = createWindow({ shouldThrow: true });

    expect(() =>
      createAutoLockNotifier({ get: () => window })("sleep"),
    ).not.toThrow();
  });

  it("每次都取当前的主窗口, 窗口被替换后推给新窗口", () => {
    const first = createWindow();
    const second = createWindow();
    let current = first.window;
    const notify = createAutoLockNotifier({ get: () => current });

    notify("idle");
    current = second.window;
    notify("sleep");

    expect(first.send).toHaveBeenCalledTimes(1);
    expect(second.send).toHaveBeenCalledWith(
      IPC_CHANNELS.vaultAutoLocked,
      "sleep",
    );
  });
});
