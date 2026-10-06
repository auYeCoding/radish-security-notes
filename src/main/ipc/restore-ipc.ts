import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { RestoreService } from "../restore/restore-service";
import type { IpcMainPort } from "./preferences-ipc";
import {
  requireRestorePassphrase,
  requireRestoreRunRequest,
} from "./restore-input-guard";

/**
 * 注册恢复相关的 IPC 通道, 参数在进程边界处校验类型与取值后才交给恢复服务. 备份文件的路径与
 * 内容都不经过这些通道: 渲染端只送备份口令, 主密码与替换确认, 只收到概要与结果摘要.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 恢复服务.
 */
export function registerRestoreIpc(
  ipcMain: IpcMainPort,
  service: RestoreService,
): void {
  ipcMain.handle(IPC_CHANNELS.restoreChooseFile, () => service.chooseFile());
  ipcMain.handle(IPC_CHANNELS.restoreSubmitPassphrase, (_event, passphrase) =>
    service.submitPassphrase(requireRestorePassphrase(passphrase)),
  );
  ipcMain.handle(IPC_CHANNELS.restoreRun, (_event, request) =>
    service.run(requireRestoreRunRequest(request)),
  );
  ipcMain.handle(IPC_CHANNELS.restoreProgress, () => service.getProgress());
  ipcMain.handle(IPC_CHANNELS.restoreCancel, () => service.cancel());
}
