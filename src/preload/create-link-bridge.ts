import type { LinkBridge } from "@shared/links/link-bridge";
import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 创建链接桥, 把打开外部链接映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 链接桥.
 */
export function createLinkBridge(ipcRenderer: IpcRendererPort): LinkBridge {
  return {
    openExternal: async (url) => {
      const opened = await ipcRenderer.invoke(
        IPC_CHANNELS.linksOpenExternal,
        url,
      );
      return opened === true;
    },
  };
}
