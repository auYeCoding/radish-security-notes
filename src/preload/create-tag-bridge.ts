import type { TagBridge } from "@shared/tags/tag-bridge";
import type { TagResult } from "@shared/tags/tag-result";
import type { TagSummary } from "@shared/tags/tag-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建标签桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 标签桥.
 */
export function createTagBridge(ipcRenderer: IpcRendererPort): TagBridge {
  return {
    list: async () => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.tagsList);
      return result as TagResult<readonly TagSummary[]>;
    },
    create: async (name, color) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.tagsCreate,
        name,
        color,
      );
      return result as TagResult<TagSummary>;
    },
    update: async (id, name, color) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.tagsUpdate,
        id,
        name,
        color,
      );
      return result as TagResult<TagSummary>;
    },
    remove: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.tagsRemove, id);
      return result as TagResult<undefined>;
    },
  };
}
