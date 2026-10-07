import { vi, type Mock } from "vitest";

/**
 * 假的主窗口: 窗口控制的五个方法都是间谍, 页面内容是一个可与调用事件里的发送者比较的对象.
 */
export interface FakeMainWindow {
  /**
   * 窗口里的页面内容.
   */
  readonly webContents: object;
  /**
   * 最小化窗口的间谍.
   */
  readonly minimize: Mock<() => void>;
  /**
   * 最大化窗口的间谍.
   */
  readonly maximize: Mock<() => void>;
  /**
   * 还原窗口的间谍.
   */
  readonly unmaximize: Mock<() => void>;
  /**
   * 读取是否最大化的间谍.
   */
  readonly isMaximized: Mock<() => boolean>;
  /**
   * 关闭窗口的间谍.
   */
  readonly close: Mock<() => void>;
}

/**
 * 创建假的主窗口.
 * @param isMaximized 窗口一开始是否最大化.
 * @returns 假的主窗口.
 */
export function createFakeMainWindow(isMaximized = false): FakeMainWindow {
  return {
    webContents: {},
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn(() => isMaximized),
    close: vi.fn(),
  };
}

/**
 * 顶层发送帧: 没有父帧.
 */
export interface TopSenderFrame {
  /**
   * 父帧, 顶层帧为 null.
   */
  readonly parent: null;
}

/**
 * 一次来自某个页面顶层帧的调用事件.
 */
export interface TopFrameEvent {
  /**
   * 发送调用的页面内容.
   */
  readonly sender: object;
  /**
   * 发送调用的帧.
   */
  readonly senderFrame: TopSenderFrame;
}

/**
 * 创建一次来自某个页面顶层帧的调用事件.
 * @param sender 发送调用的页面内容.
 * @returns 带发送者与顶层发送帧的事件.
 */
export function createTopFrameEvent(sender: object): TopFrameEvent {
  return { sender, senderFrame: { parent: null } };
}
