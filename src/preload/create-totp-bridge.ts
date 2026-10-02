import type { EntryResult } from "@shared/entries/entry-result";
import type { TotpBridge } from "@shared/entries/totp-bridge";
import type { TotpCode } from "@shared/entries/totp-config";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建 TOTP 桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns TOTP 桥.
 */
export function createTotpBridge(ipcRenderer: IpcRendererPort): TotpBridge {
  return {
    getCode: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.totpGetCode, id);
      return result as EntryResult<TotpCode>;
    },
    revealSecret: async (id) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.totpRevealSecret,
        id,
      );
      return result as EntryResult<string>;
    },
    copyCode: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.totpCopyCode, id);
      return result as EntryResult<undefined>;
    },
    copySecret: async (id) => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.totpCopySecret, id);
      return result as EntryResult<undefined>;
    },
    decodeQrImage: async (image) => {
      const result = await ipcRenderer.invoke(
        IPC_CHANNELS.totpDecodeQrImage,
        image,
      );
      return result as EntryResult<string>;
    },
  };
}
