import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { MasterPasswordVerifier } from "../vault/master-password-verifier";
import type { VaultService } from "../vault/vault-service";
import { requireMasterPassword } from "./ipc-arguments";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册主密码开关的 IPC 通道: 读取当前是否设了主密码, 开启, 关闭. 参数在进程边界处校验类型后才交给
 * 保险库服务, 新主密码的长度规则与状态是否允许切换由服务判定. 渲染进程拿不到数据密钥与恢复词.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 保险库服务.
 * @param verifier 主密码校验器, 每次调用都重读密钥文件, 用来回答当前是否设了主密码.
 */
export function registerMasterPasswordIpc(
  ipcMain: IpcMainPort,
  service: VaultService,
  verifier: MasterPasswordVerifier,
): void {
  ipcMain.handle(IPC_CHANNELS.masterPasswordHas, () =>
    verifier.hasMasterPassword(),
  );
  ipcMain.handle(IPC_CHANNELS.masterPasswordEnable, (_event, masterPassword) =>
    service.enableMasterPassword(requireMasterPassword(masterPassword)),
  );
  ipcMain.handle(
    IPC_CHANNELS.masterPasswordDisable,
    (_event, currentPassword) =>
      service.disableMasterPassword(requireMasterPassword(currentPassword)),
  );
}
