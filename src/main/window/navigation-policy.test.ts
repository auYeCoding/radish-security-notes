import { describe, expect, it } from "vitest";

import { isNavigationAllowed } from "./navigation-policy";

/**
 * 测试用的应用页面地址.
 */
const CURRENT_URL = "file:///app/index.html";

describe("isNavigationAllowed", () => {
  it("主框架对当前地址的重载放行", () => {
    expect(
      isNavigationAllowed({ url: CURRENT_URL, isMainFrame: true }, CURRENT_URL),
    ).toBe(true);
  });

  it.each([
    "https://example.test/",
    "http://localhost:5173/",
    "file:///C:/Windows/win.ini",
    "file:///app/other.html",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "about:blank",
    "",
  ])("主框架导航到别的地址 %j 不放行", (url) => {
    expect(isNavigationAllowed({ url, isMainFrame: true }, CURRENT_URL)).toBe(
      false,
    );
  });

  it("地址只在大小写或结尾斜杠上不同也不放行", () => {
    expect(
      isNavigationAllowed(
        { url: "FILE:///APP/INDEX.HTML", isMainFrame: true },
        CURRENT_URL,
      ),
    ).toBe(false);
    expect(
      isNavigationAllowed(
        { url: "http://localhost:5173", isMainFrame: true },
        "http://localhost:5173/",
      ),
    ).toBe(false);
  });

  it("子框架的导航一律不放行, 即使地址就是当前页面", () => {
    expect(
      isNavigationAllowed(
        { url: CURRENT_URL, isMainFrame: false },
        CURRENT_URL,
      ),
    ).toBe(false);
    expect(
      isNavigationAllowed(
        { url: "https://example.test/", isMainFrame: false },
        CURRENT_URL,
      ),
    ).toBe(false);
  });
});
