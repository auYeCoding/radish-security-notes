import type { ExternalLinkOpener } from "../links/external-link-opener";
import {
  isNavigationAllowed,
  type NavigationRequest,
} from "./navigation-policy";

/**
 * 需要防护的页面导航事件名, 与 Electron `WebContents` 的事件名一致: 主框架发起的导航, 任何框架
 * 发起的导航, 服务端重定向. 事件名只在这里写出, 类型, 重载签名与监听都引用它.
 */
export const NAVIGATION_EVENTS = {
  mainFrame: "will-navigate",
  anyFrame: "will-frame-navigate",
  redirect: "will-redirect",
} as const;

/**
 * 需要防护的页面导航事件.
 */
export type NavigationEventName =
  (typeof NAVIGATION_EVENTS)[keyof typeof NAVIGATION_EVENTS];

/**
 * 页面发起导航或重定向时收到的事件对象, 带目标地址与是否发生在主框架, 调用 `preventDefault`
 * 可阻止这次导航.
 */
export interface NavigationEventPort extends NavigationRequest {
  /**
   * 阻止这次导航.
   */
  readonly preventDefault: () => void;
}

/**
 * 页面导航监听函数, 收到事件对象, 返回值被忽略.
 */
export type NavigationListener = (details: NavigationEventPort) => void;

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
 * 监听页面发起的导航. 每个事件名一个重载, Electron 的 `WebContents.on` 也是按事件名分开的重载,
 * 这样 `WebContents` 才满足这个接口.
 */
export interface NavigationListenerRegistrar {
  /**
   * 监听主框架发起的导航.
   * @param event 事件名.
   * @param listener 收到事件时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  (
    event: typeof NAVIGATION_EVENTS.mainFrame,
    listener: NavigationListener,
  ): unknown;
  /**
   * 监听任何框架发起的导航.
   * @param event 事件名.
   * @param listener 收到事件时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  (
    event: typeof NAVIGATION_EVENTS.anyFrame,
    listener: NavigationListener,
  ): unknown;
  /**
   * 监听服务端重定向.
   * @param event 事件名.
   * @param listener 收到事件时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  (
    event: typeof NAVIGATION_EVENTS.redirect,
    listener: NavigationListener,
  ): unknown;
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
   * 监听页面发起的导航.
   */
  readonly on: NavigationListenerRegistrar;
  /**
   * 设置页面请求打开新窗口时的处理函数.
   * @param handler 处理函数, 返回拒绝打开.
   */
  readonly setWindowOpenHandler: (
    handler: (details: WindowOpenDetailsPort) => WindowOpenDecision,
  ) => void;
}

/**
 * 给窗口的页面加上导航防护: 页面发起的导航, 子框架发起的导航与服务端重定向都按同一条规则处理,
 * 只放行主框架对当前地址的重载, 其余一律阻止, 窗口不会离开应用; 页面请求的新窗口一律拒绝,
 * 地址符合外部链接策略时改由系统默认程序打开.
 * @param target 窗口的页面内容.
 * @param openExternalLink 外部链接打开器.
 */
export function guardWindowNavigation(
  target: NavigationGuardTarget,
  openExternalLink: ExternalLinkOpener,
): void {
  const blockForeignNavigation: NavigationListener = (details) => {
    if (!isNavigationAllowed(details, target.getURL())) {
      details.preventDefault();
    }
  };
  target.on(NAVIGATION_EVENTS.mainFrame, blockForeignNavigation);
  target.on(NAVIGATION_EVENTS.anyFrame, blockForeignNavigation);
  target.on(NAVIGATION_EVENTS.redirect, blockForeignNavigation);
  target.setWindowOpenHandler((details) => {
    void openExternalLink(details.url);
    return { action: "deny" };
  });
}
