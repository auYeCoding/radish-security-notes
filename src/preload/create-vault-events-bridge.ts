import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import { isAutoLockReason } from "@shared/vault/auto-lock-reason";
import type { VaultEventsBridge } from "@shared/vault/vault-events-bridge";

import type { IpcRendererSubscribePort } from "./create-window-controls-bridge";

/**
 * 创建保险库事件桥, 自动锁定的原因来自主进程的推送. 推送的内容不是登记过的原因时忽略, 不交给监听函数.
 * @param ipcRenderer 能订阅主进程推送的渲染进程 IPC 接口.
 * @returns 保险库事件桥.
 */
export function createVaultEventsBridge(
  ipcRenderer: Pick<IpcRendererSubscribePort, "on" | "removeListener">,
): VaultEventsBridge {
  return {
    onAutoLocked: (listener) => {
      const handleMessage = (_event: unknown, reason: unknown): void => {
        if (isAutoLockReason(reason)) {
          listener(reason);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.vaultAutoLocked, handleMessage);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.vaultAutoLocked, handleMessage);
    },
  };
}
