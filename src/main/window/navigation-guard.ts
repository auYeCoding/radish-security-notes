import type { ExternalLinkOpener } from "../links/external-link-opener";

/**
 * 页面发起导航时收到的事件, 调用 `preventDefault` 可阻止这次导航.
 */
export interface NavigationEventPort {
  /**
   * 阻止这次导航.
   */
  readonly preventDefault: () => void;
}

/**
 * 页面请求打开新窗口时收到的信息.
 */
export interface WindowOpenDetailsPort {
  /**
   * 页面要打开的地址.
   */
  readonly url: string;
}

/**
 * 页面请求打开新窗口时给出的处理结果, 只有拒绝一种.
 */
export interface WindowOpenDecision {
  /**
   * 处理动作: 拒绝打开新窗口.
   */
  readonly action: "deny";
}

/**
 * 导航防护依赖的页面内容接口, Electron 的 `WebContents` 满足它.
 */
export interface NavigationGuardTarget {
  /**
   * 读取页面当前的地址.
   * @returns 当前地址.
   */
  readonly getURL: () => string;
  /**
   * 监听页面发起导航.
   * @param event 事件名.
   * @param listener 收到事件时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  readonly on: (
    event: "will-navigate",
    listener: (event: NavigationEventPort, url: string) => void,
  ) => unknown;
  /**
   * 设置页面请求打开新窗口时的处理函数.
   * @param handler 处理函数, 返回拒绝打开.
   */
  readonly setWindowOpenHandler: (
    handler: (details: WindowOpenDetailsPort) => WindowOpenDecision,
  ) => void;
}

/**
 * 给窗口的页面加上导航防护: 页面发起的导航只放行对当前地址的重载, 其余一律阻止, 窗口不会离开
 * 应用; 页面请求的新窗口一律拒绝, 地址符合外部链接策略时改由系统默认程序打开.
 * @param target 窗口的页面内容.
 * @param openExternalLink 外部链接打开器.
 */
export function guardWindowNavigation(
  target: NavigationGuardTarget,
  openExternalLink: ExternalLinkOpener,
): void {
  target.on("will-navigate", (event, url) => {
    if (url !== target.getURL()) {
      event.preventDefault();
    }
  });
  target.setWindowOpenHandler((details) => {
    void openExternalLink(details.url);
    return { action: "deny" };
  });
}
