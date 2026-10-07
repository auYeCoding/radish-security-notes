import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

/**
 * 状态推送依赖的页面内容接口, Electron 的 `WebContents` 满足它.
 */
export interface MaximizedStateReceiver {
  /**
   * 向页面推送一条消息.
   * @param channel 通道名.
   * @param args 随消息发送的参数.
   */
  readonly send: (channel: string, ...args: unknown[]) => void;
}

/**
 * 状态推送依赖的窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface MaximizedStateWindow {
  /**
   * 窗口里的页面内容.
   */
  readonly webContents: MaximizedStateReceiver;
  /**
   * 监听窗口被最大化.
   * @param event 事件名.
   * @param listener 事件发生时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  on(event: "maximize", listener: () => void): unknown;
  /**
   * 监听窗口从最大化还原.
   * @param event 事件名.
   * @param listener 事件发生时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  on(event: "unmaximize", listener: () => void): unknown;
}

/**
 * 让窗口的最大化与还原都推送给它的页面, 页面据此更新第二个窗口按钮.
 * @param window 要监听的窗口.
 */
export function watchMaximizedState(window: MaximizedStateWindow): void {
  const push = (isMaximized: boolean): void =>
    window.webContents.send(IPC_CHANNELS.windowMaximizedChanged, isMaximized);
  window.on("maximize", () => push(true));
  window.on("unmaximize", () => push(false));
}
