import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { EmailBackupService } from "../email-backup/email-backup-service";
import {
  requireAutoBackupSaveRequest,
  requireEmailBackupRunRequest,
  requireEmailBackupSettingsInput,
} from "./email-backup-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册邮箱备份相关的 IPC 通道, 参数在进程边界处校验类型与长度后才交给邮箱备份服务. 授权码, 口令
 * 与条目内容都不会从这些通道返回: 渲染端只送设置, 授权码, 口令与主密码, 只收到 "已设置" 一类标志,
 * 进度与摘要.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 邮箱备份服务.
 */
export function registerEmailBackupIpc(
  ipcMain: IpcMainPort,
  service: EmailBackupService,
): void {
  ipcMain.handle(IPC_CHANNELS.emailBackupGetSettings, () =>
    service.getSettings(),
  );
  ipcMain.handle(IPC_CHANNELS.emailBackupSaveSettings, (_event, input) =>
    service.saveSettings(requireEmailBackupSettingsInput(input)),
  );
  ipcMain.handle(IPC_CHANNELS.emailBackupSendTest, () => service.sendTest());
  ipcMain.handle(IPC_CHANNELS.emailBackupRunBackup, (_event, request) =>
    service.runBackup(requireEmailBackupRunRequest(request)),
  );
  ipcMain.handle(IPC_CHANNELS.emailBackupProgress, () => service.getProgress());
  ipcMain.handle(IPC_CHANNELS.emailBackupGetLastResult, () =>
    service.getLastResult(),
  );
  ipcMain.handle(IPC_CHANNELS.emailBackupGetAutoBackup, () =>
    service.getAutoBackup(),
  );
  ipcMain.handle(IPC_CHANNELS.emailBackupSaveAutoBackup, (_event, request) =>
    service.saveAutoBackup(requireAutoBackupSaveRequest(request)),
  );
}
