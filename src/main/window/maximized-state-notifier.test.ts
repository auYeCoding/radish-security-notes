import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { watchMaximizedState } from "./maximized-state-notifier";

/**
 * 假窗口与它记下的监听函数和推送间谍.
 */
interface WatchedWindow {
  /**
   * 传给被测函数的窗口.
   */
  readonly window: Parameters<typeof watchMaximizedState>[0];
  /**
   * 按事件名记下的监听函数.
   */
  readonly listeners: Map<string, () => void>;
  /**
   * 页面内容的推送间谍.
   */
  readonly send: ReturnType<typeof vi.fn>;
}

/**
 * 创建一个会记下监听函数的假窗口.
 * @returns 假窗口, 监听函数表与推送间谍.
 */
function createWatchedWindow(): WatchedWindow {
  const listeners = new Map<string, () => void>();
  const send = vi.fn();
  const window = {
    webContents: { send },
    on: (event: string, listener: () => void) => {
      listeners.set(event, listener);
    },
  };
  return { window, listeners, send };
}

describe("watchMaximizedState", () => {
  it("窗口最大化时向页面推送 true", () => {
    const { window, listeners, send } = createWatchedWindow();
    watchMaximizedState(window);

    listeners.get("maximize")?.();

    expect(send).toHaveBeenCalledExactlyOnceWith(
      IPC_CHANNELS.windowMaximizedChanged,
      true,
    );
  });

  it("窗口还原时向页面推送 false", () => {
    const { window, listeners, send } = createWatchedWindow();
    watchMaximizedState(window);

    listeners.get("unmaximize")?.();

    expect(send).toHaveBeenCalledExactlyOnceWith(
      IPC_CHANNELS.windowMaximizedChanged,
      false,
    );
  });

  it("只监听最大化与还原两个事件", () => {
    const { window, listeners } = createWatchedWindow();

    watchMaximizedState(window);

    expect([...listeners.keys()].sort()).toEqual(["maximize", "unmaximize"]);
  });
});
