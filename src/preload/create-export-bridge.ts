import type { ExportBridge } from "@shared/export/export-bridge";
import type { ExportResult } from "@shared/export/export-result";
import type {
  ExportProgressSnapshot,
  ExportRunOutcome,
  ExportScopeSummary,
} from "@shared/export/export-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个导出通道, 把主进程返回的值当作导出操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的导出操作结果.
 */
async function invokeExport<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<ExportResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as ExportResult<Value>;
}

/**
 * 创建导出桥, 把每个方法映射到对应的 IPC 通道. 桥上没有任何传入或返回文件路径与文件内容的方法:
 * 保存位置由主进程弹出对话框选择, 渲染端只送范围, 选项, 口令与主密码.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 导出桥.
 */
export function createExportBridge(ipcRenderer: IpcRendererPort): ExportBridge {
  return {
    describeScope: (scope) =>
      invokeExport<ExportScopeSummary>(
        ipcRenderer,
        IPC_CHANNELS.exportDescribeScope,
        scope,
      ),
    run: (request) =>
      invokeExport<ExportRunOutcome>(
        ipcRenderer,
        IPC_CHANNELS.exportRun,
        request,
      ),
    getProgress: async () =>
      (await ipcRenderer.invoke(
        IPC_CHANNELS.exportProgress,
      )) as ExportProgressSnapshot,
    cancel: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.exportCancel);
    },
    revealFile: () =>
      invokeExport<undefined>(ipcRenderer, IPC_CHANNELS.exportRevealFile),
  };
}
