import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { VaultService } from "../vault/vault-service";
import { requireOptionalMasterPassword } from "./ipc-arguments";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册查看恢复密钥的 IPC 通道. 参数在进程边界处校验类型后才交给保险库服务, 是否已解锁, 主密码
 * 对不对由服务判定. 数据密钥只在主进程里出现, 渲染进程只拿到编码后的恢复词.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 保险库服务.
 */
export function registerRecoveryKeyIpc(
  ipcMain: IpcMainPort,
  service: VaultService,
): void {
  ipcMain.handle(IPC_CHANNELS.recoveryViewKey, (_event, masterPassword) =>
    service.viewRecoveryKey(requireOptionalMasterPassword(masterPassword)),
  );
}
