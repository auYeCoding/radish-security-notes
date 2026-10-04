import { useCallback, useState } from "react";

/**
 * 请主进程打开外部链接的函数, 成功交给系统时兑现 true.
 */
export type OpenExternalLink = (url: string) => Promise<boolean>;

/**
 * 外部链接打开请求的状态与方法.
 */
export interface ExternalLinkRequest {
  /**
   * 等待用户确认的地址, 没有待确认的请求时为 undefined.
   */
  readonly pendingUrl: string | undefined;
  /**
   * 是否正在请主进程打开.
   */
  readonly isOpening: boolean;
  /**
   * 最近一次打开是否失败.
   */
  readonly hasFailed: boolean;
  /**
   * 登记一个待用户确认的地址.
   * @param url 要打开的地址.
   */
  readonly request: (url: string) => void;
  /**
   * 放弃待确认的请求.
   */
  readonly cancel: () => void;
  /**
   * 用户确认后请主进程打开待确认的地址, 成功时清除请求, 失败时记下失败.
   * @returns 请求完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 跟踪外部链接的打开请求: 点击链接只登记地址, 用户在确认框里确认后才请主进程打开.
 * @param openExternalLink 请主进程打开外部链接的函数.
 * @returns 请求的状态与方法.
 */
export function useExternalLinkRequest(
  openExternalLink: OpenExternalLink,
): ExternalLinkRequest {
  const [pendingUrl, setPendingUrl] = useState<string | undefined>(undefined);
  const [isOpening, setIsOpening] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const request = useCallback((url: string): void => {
    setHasFailed(false);
    setPendingUrl(url);
  }, []);
  const cancel = useCallback((): void => {
    setHasFailed(false);
    setPendingUrl(undefined);
  }, []);
  const confirm = useCallback(async (): Promise<void> => {
    if (pendingUrl === undefined) {
      return;
    }
    setIsOpening(true);
    const isOpened = await openExternalLink(pendingUrl).catch(() => false);
    setIsOpening(false);
    setHasFailed(!isOpened);
    if (isOpened) {
      setPendingUrl(undefined);
    }
  }, [openExternalLink, pendingUrl]);
  return { pendingUrl, isOpening, hasFailed, request, cancel, confirm };
}
