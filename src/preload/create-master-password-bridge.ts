import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建主密码开关桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 主密码开关桥.
 */
export function createMasterPasswordBridge(
  ipcRenderer: IpcRendererPort,
): MasterPasswordBridge {
  return {
    hasMasterPassword: async () => {
      const hasMasterPassword = await ipcRenderer.invoke(
        IPC_CHANNELS.masterPasswordHas,
      );
      return hasMasterPassword as boolean;
    },
    enable: async (masterPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.masterPasswordEnable,
        masterPassword,
      );
      return result as VaultOperationResult;
    },
    disable: async (currentPassword) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.masterPasswordDisable,
        currentPassword,
      );
      return result as VaultOperationResult;
    },
  };
}
