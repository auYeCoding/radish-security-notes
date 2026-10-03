import type { FolderBridge } from "@shared/folders/folder-bridge";
import type { FolderResult } from "@shared/folders/folder-result";
import type { FolderSummary } from "@shared/folders/folder-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建文件夹桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 文件夹桥.
 */
export function createFolderBridge(ipcRenderer: IpcRendererPort): FolderBridge {
  return {
    list: async () => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.foldersList);
      return result as FolderResult<readonly FolderSummary[]>;
    },
    create: async (name) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.foldersCreate, name);
      return result as FolderResult<FolderSummary>;
    },
    rename: async (id, name) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.foldersRename,
        id,
        name,
      );
      return result as FolderResult<FolderSummary>;
    },
    remove: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.foldersRemove, id);
      return result as FolderResult<undefined>;
    },
    assignEntry: async (entryId, folderId) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.foldersAssignEntry,
        entryId,
        folderId,
      );
      return result as FolderResult<undefined>;
    },
  };
}
