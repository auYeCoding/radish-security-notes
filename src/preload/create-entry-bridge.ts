import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryResult } from "@shared/entries/entry-result";
import type { EntryDetail, EntrySummary } from "@shared/entries/entry-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { EntrySearchHit } from "@shared/search/entry-search-types";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 调用一个条目通道, 把主进程返回的值当作条目操作的结果.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @param channel 通道名.
 * @param args 传给主进程的参数.
 * @returns 主进程返回的条目操作结果.
 */
async function invokeEntry<Value>(
  ipcRenderer: IpcRendererPort,
  channel: string,
  ...args: unknown[]
): Promise<EntryResult<Value>> {
  const result = await ipcRenderer.invoke(channel, ...args);
  return result as EntryResult<Value>;
}

/**
 * 创建条目桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 条目桥.
 */
export function createEntryBridge(ipcRenderer: IpcRendererPort): EntryBridge {
  return {
    list: () =>
      invokeEntry<readonly EntrySummary[]>(
        ipcRenderer,
        IPC_CHANNELS.entriesList,
      ),
    search: (query) =>
      invokeEntry<readonly EntrySearchHit[]>(
        ipcRenderer,
        IPC_CHANNELS.entriesSearch,
        query,
      ),
    get: (id) =>
      invokeEntry<EntryDetail>(ipcRenderer, IPC_CHANNELS.entriesGet, id),
    create: (input) =>
      invokeEntry<EntryDetail>(ipcRenderer, IPC_CHANNELS.entriesCreate, input),
    update: (id, input) =>
      invokeEntry<EntryDetail>(
        ipcRenderer,
        IPC_CHANNELS.entriesUpdate,
        id,
        input,
      ),
    remove: (id) =>
      invokeEntry<undefined>(ipcRenderer, IPC_CHANNELS.entriesRemove, id),
    copyField: (id, field) =>
      invokeEntry<undefined>(
        ipcRenderer,
        IPC_CHANNELS.entriesCopyField,
        id,
        field,
      ),
    copyCustomField: (id, customFieldId) =>
      invokeEntry<undefined>(
        ipcRenderer,
        IPC_CHANNELS.entriesCopyCustomField,
        id,
        customFieldId,
      ),
  };
}
