import { shell } from "electron";

import {
  createExternalLinkOpener,
  type ExternalLinkOpener,
} from "../links/external-link-opener";

/**
 * 用 Electron 的 `shell` 创建外部链接打开器: 符合外部链接策略的地址交给系统默认程序打开.
 * @returns 外部链接打开器.
 */
export function createLinkRuntime(): ExternalLinkOpener {
  return createExternalLinkOpener((url) => shell.openExternal(url));
}
