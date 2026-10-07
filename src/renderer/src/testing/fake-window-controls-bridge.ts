import { vi } from "vitest";

import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

/**
 * 假窗口控制桥: 在窗口控制桥之外, 让测试模拟主进程推送最大化状态, 并查看还有几个订阅.
 */
export interface FakeWindowControlsBridge extends WindowControlsBridge {
  /**
   * 模拟主进程推送一次最大化状态的变化, 当前的每个订阅都会收到.
   * @param isMaximized 推送的状态.
   */
  readonly emitMaximizedChange: (isMaximized: boolean) => void;
  /**
   * 读取当前还没取消的订阅个数.
   * @returns 订阅个数.
   */
  readonly getListenerCount: () => number;
}

/**
 * 创建假窗口控制桥: 四个窗口控制方法是间谍, 默认都兑现, 窗口默认没有最大化.
 * @param overrides 覆盖的方法, 例如让读取初始状态得到已最大化.
 * @returns 假窗口控制桥.
 */
export function createFakeWindowControlsBridge(
  overrides: Partial<WindowControlsBridge> = {},
): FakeWindowControlsBridge {
  const listeners = new Set<(isMaximized: boolean) => void>();
  return {
    minimize: vi.fn(() => Promise.resolve()),
    toggleMaximize: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onMaximizedChange: vi.fn((listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
    emitMaximizedChange: (isMaximized) =>
      listeners.forEach((listener) => listener(isMaximized)),
    getListenerCount: () => listeners.size,
    ...overrides,
  };
}
