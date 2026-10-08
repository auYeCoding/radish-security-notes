import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { AutoLockReason } from "@shared/vault/auto-lock-reason";

import { attemptSilently } from "../vault/attempt-silently";
import type { MainWindowHolder } from "../window/main-window-holder";

/**
 * 通知依赖的主窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface AutoLockNotifierWindow {
  /**
   * 窗口里的页面内容.
   */
  readonly webContents: {
    /**
     * 向页面推送一条消息.
     * @param channel 通道名.
     * @param args 随消息发送的参数.
     */
    readonly send: (channel: string, ...args: unknown[]) => void;
  };
  /**
   * 窗口是否已销毁.
   * @returns 已销毁时为 true.
   */
  isDestroyed(): boolean;
}

/**
 * 创建自动锁定的通知函数: 自动锁定成功后把原因推送给主窗口的页面, 页面据此把保险库状态置为已锁定.
 * 没有主窗口, 窗口已销毁或推送抛错时什么也不做, 不写日志.
 * @param holder 主窗口持有者.
 * @returns 通知函数.
 */
export function createAutoLockNotifier(
  holder: Pick<MainWindowHolder<AutoLockNotifierWindow>, "get">,
): (reason: AutoLockReason) => void {
  return (reason) => {
    const window = holder.get();
    if (window === undefined || window.isDestroyed()) {
      return;
    }
    attemptSilently(() =>
      window.webContents.send(IPC_CHANNELS.vaultAutoLocked, reason),
    );
  };
}
