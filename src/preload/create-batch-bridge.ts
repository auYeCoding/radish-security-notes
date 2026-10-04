import type { BatchBridge } from "@shared/batch/batch-bridge";
import type { BatchResult } from "@shared/batch/batch-result";
import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个批量通道, 把主进程返回的值当作批量操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的批量操作结果.
 */
async function invokeBatch<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<BatchResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as BatchResult<Value>;
}

/**
 * 创建批量桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 批量桥.
 */
export function createBatchBridge(ipcRenderer: IpcRendererPort): BatchBridge {
  return {
    removeEntries: (entryIds) =>
      invokeBatch<undefined>(
        ipcRenderer,
        IPC_CHANNELS.batchRemoveEntries,
        entryIds,
      ),
    moveEntries: (entryIds, folderId) =>
      invokeBatch<undefined>(
        ipcRenderer,
        IPC_CHANNELS.batchMoveEntries,
        entryIds,
        folderId,
      ),
    addTag: (entryIds, tagId) =>
      invokeBatch<readonly EntryTagAssignment[]>(
        ipcRenderer,
        IPC_CHANNELS.batchAddTag,
        entryIds,
        tagId,
      ),
    removeTag: (entryIds, tagId) =>
      invokeBatch<readonly EntryTagAssignment[]>(
        ipcRenderer,
        IPC_CHANNELS.batchRemoveTag,
        entryIds,
        tagId,
      ),
  };
}
