import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";
import type {
  EmailBackupLastResult,
  EmailBackupResult,
  EmailBackupRunOutcome,
} from "@shared/email-backup/email-backup-result";
import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个邮箱备份通道, 把主进程返回的值当作邮箱备份操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的邮箱备份操作结果.
 */
async function invokeEmailBackup<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<EmailBackupResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as EmailBackupResult<Value>;
}

/**
 * 创建邮箱备份桥, 把每个方法映射到对应的 IPC 通道. 桥上没有返回授权码, 口令与条目内容的方法:
 * 渲染端只送设置, 授权码, 口令与主密码, 只拿到 "已设置" 一类标志, 进度与摘要.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 邮箱备份桥.
 */
export function createEmailBackupBridge(
  ipcRenderer: IpcRendererPort,
): EmailBackupBridge {
  return {
    getSettings: () =>
      invokeEmailBackup<EmailBackupSettingsView>(
        ipcRenderer,
        IPC_CHANNELS.emailBackupGetSettings,
      ),
    saveSettings: (input) =>
      invokeEmailBackup<EmailBackupSettingsView>(
        ipcRenderer,
        IPC_CHANNELS.emailBackupSaveSettings,
        input,
      ),
    sendTest: () =>
      invokeEmailBackup<undefined>(
        ipcRenderer,
        IPC_CHANNELS.emailBackupSendTest,
      ),
    runBackup: (request) =>
      invokeEmailBackup<EmailBackupRunOutcome>(
        ipcRenderer,
        IPC_CHANNELS.emailBackupRunBackup,
        request,
      ),
    getProgress: async () =>
      (await ipcRenderer.invoke(
        IPC_CHANNELS.emailBackupProgress,
      )) as EmailBackupProgressSnapshot,
    getLastResult: () =>
      invokeEmailBackup<EmailBackupLastResult | undefined>(
        ipcRenderer,
        IPC_CHANNELS.emailBackupGetLastResult,
      ),
  };
}
