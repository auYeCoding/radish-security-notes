import { describe, expect, it, vi } from "vitest";

import {
  guardWindowNavigation,
  type NavigationEventPort,
  type NavigationGuardTarget,
  type WindowOpenDecision,
  type WindowOpenDetailsPort,
} from "./navigation-guard";

/**
 * 记下注册的处理函数的假页面内容.
 */
interface FakeTarget extends NavigationGuardTarget {
  /**
   * 模拟页面发起导航, 返回这次导航有没有被阻止.
   * @param url 导航的目标地址.
   * @returns 被阻止时为 true.
   */
  readonly navigate: (url: string) => boolean;
  /**
   * 模拟页面请求打开新窗口.
   * @param url 要打开的地址.
   * @returns 处理函数给出的结果.
   */
  readonly openWindow: (url: string) => WindowOpenDecision;
}

/**
 * 页面导航监听函数的类型.
 */
type NavigationListener = (event: NavigationEventPort, url: string) => void;

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
  const listeners: NavigationListener[] = [];
  const handlers: WindowOpenHandler[] = [];
  return {
    getURL: () => currentUrl,
    on: (_event, listener) => listeners.push(listener),
    setWindowOpenHandler: (handler) => handlers.push(handler),
    navigate: (url) => {
      const preventDefault = vi.fn();
      listeners.forEach((listener) => listener({ preventDefault }, url));
      return preventDefault.mock.calls.length > 0;
    },
    openWindow: (url) => {
      const [handler] = handlers;
      return handler === undefined ? { action: "deny" } : handler({ url });
    },
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
