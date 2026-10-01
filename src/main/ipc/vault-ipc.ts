import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { VaultService } from "../vault/vault-service";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 校验渲染进程传来的主密码参数是字符串.
 * @param masterPassword 渲染进程传来的值.
 * @returns 校验通过的主密码.
 * @throws Error 当参数不是字符串时.
 */
function requireMasterPassword(masterPassword: unknown): string {
  if (typeof masterPassword !== "string") {
    throw new Error("无效的主密码");
  }
  return masterPassword;
}

/**
 * 注册保险库相关的 IPC 通道, 参数在进程边界处校验后才交给保险库服务. 主密码的长度规则
 * 由服务判定, 这里只保证类型.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 保险库服务.
 */
export function registerVaultIpc(
  ipcMain: IpcMainPort,
  service: VaultService,
): void {
  ipcMain.handle(IPC_CHANNELS.vaultGetStatus, () => service.getStatus());
  ipcMain.handle(
    IPC_CHANNELS.vaultSetupWithMasterPassword,
    (_event, masterPassword) =>
      service.setupWithMasterPassword(requireMasterPassword(masterPassword)),
  );
  ipcMain.handle(IPC_CHANNELS.vaultSetupWithoutMasterPassword, () =>
    service.setupWithoutMasterPassword(),
  );
  ipcMain.handle(IPC_CHANNELS.vaultUnlock, (_event, masterPassword) =>
    service.unlock(requireMasterPassword(masterPassword)),
  );
}
