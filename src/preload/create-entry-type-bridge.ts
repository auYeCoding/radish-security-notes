import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import type { CustomEntryTypeResult } from "@shared/entries/custom-types/custom-entry-type-result";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建自定义条目类型桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 自定义条目类型桥.
 */
export function createEntryTypeBridge(
  ipcRenderer: IpcRendererPort,
): CustomEntryTypeBridge {
  return {
    list: async () => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.entryTypesList);
      return result as CustomEntryTypeResult<readonly CustomEntryType[]>;
    },
    create: async (input) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.entryTypesCreate,
        input,
      );
      return result as CustomEntryTypeResult<CustomEntryType>;
    },
  };
}
