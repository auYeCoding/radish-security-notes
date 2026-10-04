import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { ExternalLinkOpener } from "../links/external-link-opener";
import { requireExternalLinkUrl } from "./link-url-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册链接相关的 IPC 通道, 参数在进程边界处校验类型, 地址是否允许打开由打开器按外部链接策略判定.
 * @param ipcMain 主进程 IPC 接口.
 * @param openExternalLink 外部链接打开器.
 */
export function registerLinkIpc(
  ipcMain: IpcMainPort,
  openExternalLink: ExternalLinkOpener,
): void {
  ipcMain.handle(IPC_CHANNELS.linksOpenExternal, (_event, url) =>
    openExternalLink(requireExternalLinkUrl(url)),
  );
}
