import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryResult } from "@shared/entries/entry-result";
import type { EntryDetail, EntrySummary } from "@shared/entries/entry-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建条目桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 条目桥.
 */
export function createEntryBridge(ipcRenderer: IpcRendererPort): EntryBridge {
  return {
    list: async () => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.entriesList);
      return result as EntryResult<readonly EntrySummary[]>;
    },
    get: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.entriesGet, id);
      return result as EntryResult<EntryDetail>;
    },
    create: async (input) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.entriesCreate,
        input,
      );
      return result as EntryResult<EntryDetail>;
    },
    update: async (id, input) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.entriesUpdate,
        id,
        input,
      );
      return result as EntryResult<EntryDetail>;
    },
    remove: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.entriesRemove, id);
      return result as EntryResult<undefined>;
    },
    copyField: async (id, field) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.entriesCopyField,
        id,
        field,
      );
      return result as EntryResult<undefined>;
    },
    copyCustomField: async (id, customFieldId) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.entriesCopyCustomField,
        id,
        customFieldId,
      );
      return result as EntryResult<undefined>;
    },
  };
}
