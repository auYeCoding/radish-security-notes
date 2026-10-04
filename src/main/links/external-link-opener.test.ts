import { describe, expect, it, vi } from "vitest";

import { createExternalLinkOpener } from "./external-link-opener";

describe("createExternalLinkOpener", () => {
  it.each([
    "https://example.test/a?b=1",
    "http://example.test",
    "mailto:someone@example.test",
  ])("允许的地址 %s 交给系统打开并返回 true", async (url) => {
    const openExternal = vi.fn(() => Promise.resolve());

    const result = await createExternalLinkOpener(openExternal)(url);

    expect(result).toBe(true);
    expect(openExternal).toHaveBeenCalledExactlyOnceWith(url);
  });

  it.each([
    "javascript:alert(1)",
    "file:///C:/Windows/win.ini",
    "data:text/html,<script>alert(1)</script>",
    "ms-msdt:/id",
    "ftp://example.test",
    "/relative",
    "#anchor",
    "",
  ])("不允许的地址 %j 不交给系统, 返回 false", async (url) => {
    const openExternal = vi.fn(() => Promise.resolve());

    const result = await createExternalLinkOpener(openExternal)(url);

    expect(result).toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("系统打不开时返回 false, 不抛出错误", async () => {
    const openExternal = vi.fn(() => Promise.reject(new Error("no handler")));

    const result = await createExternalLinkOpener(openExternal)(
      "https://example.test",
    );

    expect(result).toBe(false);
  });
});
