import { isAllowedExternalLink } from "@shared/links/external-link-policy";

/**
 * 把地址交给系统默认程序打开的函数, 对应 Electron 的 `shell.openExternal`.
 */
export type OpenExternalFunction = (url: string) => Promise<void>;

/**
 * 外部链接打开器: 校验地址符合外部链接策略后才交给系统打开.
 * @param url 要打开的地址.
 * @returns 地址符合策略并已交给系统时为 true, 不符合策略或系统打不开时为 false.
 */
export type ExternalLinkOpener = (url: string) => Promise<boolean>;

/**
 * 创建外部链接打开器. 地址不进日志, 系统打不开时只返回 false.
 * @param openExternal 把地址交给系统默认程序打开的函数.
 * @returns 外部链接打开器.
 */
export function createExternalLinkOpener(
  openExternal: OpenExternalFunction,
): ExternalLinkOpener {
  return async (url) => {
    if (!isAllowedExternalLink(url)) {
      return false;
    }
    try {
      await openExternal(url);
      return true;
    } catch {
      return false;
    }
  };
}
