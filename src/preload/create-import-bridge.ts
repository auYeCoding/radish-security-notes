import type { ImportBridge } from "@shared/import/import-bridge";
import type { ImportResult } from "@shared/import/import-result";
import type {
  ImportChooseOutcome,
  ImportOutcome,
  ImportProgressSnapshot,
  ImportReportSaveOutcome,
} from "@shared/import/import-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个导入通道, 把主进程返回的值当作导入操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的导入操作结果.
 */
async function invokeImport<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<ImportResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as ImportResult<Value>;
}

/**
 * 创建导入桥, 把每个方法映射到对应的 IPC 通道. 桥上没有任何传入文件路径的方法: 来源文件由主进程
 * 弹出对话框选择, 路径与内容都不经渲染端.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 导入桥.
 */
export function createImportBridge(ipcRenderer: IpcRendererPort): ImportBridge {
  return {
    chooseFile: (sourceKey) =>
      invokeImport<ImportChooseOutcome>(
        ipcRenderer,
        IPC_CHANNELS.importChooseFile,
        sourceKey,
      ),
    run: (options) =>
      invokeImport<ImportOutcome>(ipcRenderer, IPC_CHANNELS.importRun, options),
    getProgress: async () =>
      (await ipcRenderer.invoke(
        IPC_CHANNELS.importProgress,
      )) as ImportProgressSnapshot,
    cancel: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.importCancel);
    },
    saveReport: () =>
      invokeImport<ImportReportSaveOutcome>(
        ipcRenderer,
        IPC_CHANNELS.importSaveReport,
      ),
    revealFile: () =>
      invokeImport<undefined>(ipcRenderer, IPC_CHANNELS.importRevealFile),
  };
}
