import { beforeEach, describe, expect, it, vi } from "vitest";

import { createLinkRuntime } from "./link-runtime";

/**
 * 替身 electron 模块里的系统打开间谍.
 */
const electronMocks = vi.hoisted(() => ({
  openExternal: vi.fn(() => Promise.resolve()),
}));

vi.mock("electron", () => ({
  shell: { openExternal: electronMocks.openExternal },
}));

beforeEach(() => {
  electronMocks.openExternal.mockClear();
});

describe("createLinkRuntime", () => {
  it("允许的地址交给 shell.openExternal 打开", async () => {
    const result = await createLinkRuntime()("https://example.test");

    expect(result).toBe(true);
    expect(electronMocks.openExternal).toHaveBeenCalledExactlyOnceWith(
      "https://example.test",
    );
  });

  it("不允许的地址不交给 shell.openExternal", async () => {
    const result = await createLinkRuntime()("file:///C:/Windows/win.ini");

    expect(result).toBe(false);
    expect(electronMocks.openExternal).not.toHaveBeenCalled();
  });
});
