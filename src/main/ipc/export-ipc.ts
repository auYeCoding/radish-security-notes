import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { ExportService } from "../export/export-service";
import { requireExportRequest, requireExportScope } from "./export-input-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册导出相关的 IPC 通道, 参数在进程边界处校验类型与取值后才交给导出服务. 文件内容与文件路径
 * 都不经过这些通道: 渲染端只送范围, 选项, 口令与主密码, 只收到计数与导出摘要.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 导出服务.
 */
export function registerExportIpc(
  ipcMain: IpcMainPort,
  service: ExportService,
): void {
  ipcMain.handle(IPC_CHANNELS.exportDescribeScope, (_event, scope) =>
    service.describeScope(requireExportScope(scope)),
  );
  ipcMain.handle(IPC_CHANNELS.exportRun, (_event, request) =>
    service.run(requireExportRequest(request)),
  );
  ipcMain.handle(IPC_CHANNELS.exportProgress, () => service.getProgress());
  ipcMain.handle(IPC_CHANNELS.exportCancel, () => service.cancel());
  ipcMain.handle(IPC_CHANNELS.exportRevealFile, () => service.revealFile());
}
