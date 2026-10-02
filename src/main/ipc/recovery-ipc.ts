import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { RecoveryTextFileSaver } from "../recovery/recovery-text-file-saver";
import type { VaultService } from "../vault/vault-service";
import { requireMasterPassword, requireRecoveryWords } from "./ipc-arguments";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册恢复相关的 IPC 通道: 校验恢复词, 凭词恢复保险库, 保存恢复词文本文件. 参数在进程边界处
 * 校验类型与大小, 恢复词是否合法由保险库服务判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 保险库服务.
 * @param textFileSaver 恢复词文本文件保存器.
 */
export function registerRecoveryIpc(
  ipcMain: IpcMainPort,
  service: VaultService,
  textFileSaver: RecoveryTextFileSaver,
): void {
  ipcMain.handle(IPC_CHANNELS.recoveryVerifyWords, (_event, words) =>
    service.verifyRecoveryWords(requireRecoveryWords(words)),
  );
  ipcMain.handle(
    IPC_CHANNELS.recoveryRestoreWithMasterPassword,
    (_event, words, masterPassword) =>
      service.restoreWithMasterPassword(
        requireRecoveryWords(words),
        requireMasterPassword(masterPassword),
      ),
  );
  ipcMain.handle(
    IPC_CHANNELS.recoveryRestoreWithoutMasterPassword,
    (_event, words) =>
      service.restoreWithoutMasterPassword(requireRecoveryWords(words)),
  );
  ipcMain.handle(IPC_CHANNELS.recoverySaveTextFile, (_event, words) =>
    textFileSaver.save(requireRecoveryWords(words)),
  );
}
