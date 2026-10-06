import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { RestoreBridge } from "@shared/restore/restore-bridge";
import type { RestoreResult } from "@shared/restore/restore-result";
import type {
  RestoreChooseOutcome,
  RestoreOutcome,
  RestoreProgressSnapshot,
  RestoreReadyOutcome,
} from "@shared/restore/restore-types";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个恢复通道, 把主进程返回的值当作恢复操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的恢复操作结果.
 */
async function invokeRestore<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<RestoreResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as RestoreResult<Value>;
}

/**
 * 创建恢复桥, 把每个方法映射到对应的 IPC 通道. 桥上没有任何传入或传出文件路径与文件内容的
 * 方法: 备份文件由主进程弹出对话框选择, 读取, 解密, 解包与校验, 口令只随提交口令的那一次调用送出.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 恢复桥.
 */
export function createRestoreBridge(
  ipcRenderer: IpcRendererPort,
): RestoreBridge {
  return {
    chooseFile: () =>
      invokeRestore<RestoreChooseOutcome>(
        ipcRenderer,
        IPC_CHANNELS.restoreChooseFile,
      ),
    submitPassphrase: (passphrase) =>
      invokeRestore<RestoreReadyOutcome>(
        ipcRenderer,
        IPC_CHANNELS.restoreSubmitPassphrase,
        passphrase,
      ),
    run: (request) =>
      invokeRestore<RestoreOutcome>(
        ipcRenderer,
        IPC_CHANNELS.restoreRun,
        request,
      ),
    getProgress: async () =>
      (await ipcRenderer.invoke(
        IPC_CHANNELS.restoreProgress,
      )) as RestoreProgressSnapshot,
    cancel: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.restoreCancel);
    },
  };
}
