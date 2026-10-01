import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { VaultBridge } from "@shared/vault/vault-bridge";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建保险库桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 保险库桥.
 */
export function createVaultBridge(ipcRenderer: IpcRendererPort): VaultBridge {
  return {
    getStatus: async () => {
      const status = await ipcRenderer.invoke(IPC_CHANNELS.vaultGetStatus);
      return status as VaultStatus;
    },
    setupWithMasterPassword: async (masterPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.vaultSetupWithMasterPassword,
        masterPassword,
      );
      return result as VaultOperationResult;
    },
    setupWithoutMasterPassword: async () => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.vaultSetupWithoutMasterPassword,
      );
      return result as VaultOperationResult;
    },
    unlock: async (masterPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.vaultUnlock,
        masterPassword,
      );
      return result as VaultOperationResult;
    },
  };
}
