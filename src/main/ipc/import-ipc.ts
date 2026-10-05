import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { ImportService } from "../import/import-service";
import {
  requireImportRunOptions,
  requireImportSourceKey,
} from "./import-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册导入相关的 IPC 通道, 参数在进程边界处校验类型与取值后才交给导入服务. 来源文件的路径,
 * 内容与解析结果都不经过这些通道: 渲染端只送来源键与确认选项, 只收到概要与未能带入清单.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 导入服务.
 */
export function registerImportIpc(
  ipcMain: IpcMainPort,
  service: ImportService,
): void {
  ipcMain.handle(IPC_CHANNELS.importChooseFile, (_event, sourceKey) =>
    service.chooseFile(requireImportSourceKey(sourceKey)),
  );
  ipcMain.handle(IPC_CHANNELS.importRun, (_event, options) =>
    service.run(requireImportRunOptions(options)),
  );
  ipcMain.handle(IPC_CHANNELS.importProgress, () => service.getProgress());
  ipcMain.handle(IPC_CHANNELS.importCancel, () => service.cancel());
  ipcMain.handle(IPC_CHANNELS.importSaveReport, () => service.saveReport());
  ipcMain.handle(IPC_CHANNELS.importRevealFile, () => service.revealFile());
}
