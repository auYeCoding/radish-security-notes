import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type {
  RecoveryBridge,
  RecoveryKeyViewResult,
  RecoveryTextFileStatus,
} from "@shared/vault/recovery-bridge";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建恢复桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 恢复桥.
 */
export function createRecoveryBridge(
  ipcRenderer: IpcRendererPort,
): RecoveryBridge {
  return {
    verifyWords: async (words) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.recoveryVerifyWords,
        words,
      );
      return result as VaultOperationResult;
    },
    restoreWithMasterPassword: async (words, masterPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.recoveryRestoreWithMasterPassword,
        words,
        masterPassword,
      );
      return result as VaultOperationResult;
    },
    restoreWithoutMasterPassword: async (words) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.recoveryRestoreWithoutMasterPassword,
        words,
      );
      return result as VaultOperationResult;
    },
    saveTextFile: async (words) => {
      const status = await ipcRenderer.invoke(
        IPC_CHANNELS.recoverySaveTextFile,
        words,
      );
      return status as RecoveryTextFileStatus;
    },
    viewKey: async (masterPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.recoveryViewKey,
        masterPassword,
      );
      return result as RecoveryKeyViewResult;
    },
  };
}
