import { describe, expect, it, vi } from "vitest";

import {
  guardWindowNavigation,
  type NavigationEventName,
  type NavigationGuardTarget,
  type NavigationListener,
  type WindowOpenDecision,
  type WindowOpenDetailsPort,
} from "./navigation-guard";

/**
 * 导航防护应当监听的全部事件.
 */
const GUARDED_EVENTS: readonly NavigationEventName[] = [
  "will-navigate",
  "will-frame-navigate",
  "will-redirect",
];

/**
 * 模拟一次导航时的可选项.
 */
interface NavigateOptions {
  /**
   * 触发的事件, 默认是主框架的 `will-navigate`.
   */
  readonly eventName?: NavigationEventName;
  /**
   * 导航是否发生在主框架里, 默认是.
   */
  readonly isMainFrame?: boolean;
}

/**
 * 记下注册的处理函数的假页面内容.
 */
interface FakeTarget extends NavigationGuardTarget {
  /**
   * 模拟页面发起导航, 返回这次导航有没有被阻止.
   * @param url 导航的目标地址.
   * @param options 触发的事件与是否在主框架里.
   * @returns 被阻止时为 true.
   */
  readonly navigate: (url: string, options?: NavigateOptions) => boolean;
  /**
   * 模拟页面请求打开新窗口.
   * @param url 要打开的地址.
   * @returns 处理函数给出的结果.
   */
  readonly openWindow: (url: string) => WindowOpenDecision;
  /**
   * 列出已经注册了监听函数的导航事件.
   * @returns 事件名列表.
   */
  readonly listenedEvents: () => NavigationEventName[];
}

/**
 * 新窗口处理函数的类型.
 */
type WindowOpenHandler = (details: WindowOpenDetailsPort) => WindowOpenDecision;

/**
 * 创建假页面内容.
 * @param currentUrl 页面当前的地址.
 * @returns 假页面内容.
 */
function createFakeTarget(currentUrl: string): FakeTarget {
  const listeners = new Map<NavigationEventName, NavigationListener[]>();
  const handlers: WindowOpenHandler[] = [];
  return {
    getURL: () => currentUrl,
    on: (eventName, listener) =>
      listeners.set(eventName, [...(listeners.get(eventName) ?? []), listener]),
    setWindowOpenHandler: (handler) => handlers.push(handler),
    navigate: (url, options = {}) => {
      const { eventName = "will-navigate", isMainFrame = true } = options;
      const preventDefault = vi.fn();
      (listeners.get(eventName) ?? []).forEach((listener) =>
        listener({ preventDefault, url, isMainFrame }),
      );
      return preventDefault.mock.calls.length > 0;
    },
    openWindow: (url) => {
      const [handler] = handlers;
      return handler === undefined ? { action: "deny" } : handler({ url });
    },
    listenedEvents: () => [...listeners.keys()],
  };
}

describe("guardWindowNavigation 页面导航", () => {
  it("导航到别的地址一律被阻止, 不论协议", () => {
    const target = createFakeTarget("file:///app/index.html");
    guardWindowNavigation(
      target,
      vi.fn(() => Promise.resolve(true)),
    );

    for (const url of [
      "https://example.test",
      "http://localhost:5173/",
      "file:///C:/Windows/win.ini",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///app/other.html",
    ]) {
      expect(target.navigate(url)).toBe(true);
    }
  });

  it("对当前地址的重载不阻止", () => {
    const target = createFakeTarget("http://localhost:5173/");
    guardWindowNavigation(
      target,
      vi.fn(() => Promise.resolve(true)),
    );

    expect(target.navigate("http://localhost:5173/")).toBe(false);
  });
});

describe("guardWindowNavigation 重定向与子框架", () => {
  it("导航, 子框架导航与重定向三个事件都注册了监听", () => {
    const target = createFakeTarget("file:///app/index.html");
    guardWindowNavigation(
      target,
      vi.fn(() => Promise.resolve(true)),
    );

    expect([...target.listenedEvents()].sort()).toEqual(
      [...GUARDED_EVENTS].sort(),
    );
  });

  it.each(GUARDED_EVENTS)(
    "%s 事件里主框架去别的地址被阻止, 重载当前地址不阻止",
    (eventName) => {
      const target = createFakeTarget("file:///app/index.html");
      guardWindowNavigation(
        target,
        vi.fn(() => Promise.resolve(true)),
      );

      expect(target.navigate("https://example.test/", { eventName })).toBe(
        true,
      );
      expect(target.navigate("file:///app/index.html", { eventName })).toBe(
        false,
      );
    },
  );

  it.each(GUARDED_EVENTS)(
    "%s 事件里子框架的导航一律被阻止, 即使地址就是当前页面",
    (eventName) => {
      const target = createFakeTarget("file:///app/index.html");
      guardWindowNavigation(
        target,
        vi.fn(() => Promise.resolve(true)),
      );

      for (const url of ["https://example.test/", "file:///app/index.html"]) {
        expect(target.navigate(url, { eventName, isMainFrame: false })).toBe(
          true,
        );
      }
    },
  );
});

describe("guardWindowNavigation 新窗口", () => {
  it("新窗口一律拒绝, 地址交给外部链接打开器处理", () => {
    const target = createFakeTarget("file:///app/index.html");
    const openExternalLink = vi.fn(() => Promise.resolve(true));
    guardWindowNavigation(target, openExternalLink);

    const result = target.openWindow("https://example.test/a");

    expect(result).toEqual({ action: "deny" });
    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith(
      "https://example.test/a",
    );
  });

  it("危险地址同样拒绝新窗口, 是否打开由外部链接打开器按策略判定", () => {
    const target = createFakeTarget("file:///app/index.html");
    const openExternalLink = vi.fn(() => Promise.resolve(false));
    guardWindowNavigation(target, openExternalLink);

    const result = target.openWindow("file:///C:/Windows/win.ini");

    expect(result).toEqual({ action: "deny" });
    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith(
      "file:///C:/Windows/win.ini",
    );
  });
});
