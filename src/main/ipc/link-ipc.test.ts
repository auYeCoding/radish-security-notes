import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain } from "../testing/fake-ipc-main";
import { registerLinkIpc } from "./link-ipc";

describe("registerLinkIpc", () => {
  it("打开通道把地址交给打开器并返回它的结果", async () => {
    const ipcMain = createFakeIpcMain();
    const openExternalLink = vi.fn(() => Promise.resolve(true));
    registerLinkIpc(ipcMain, openExternalLink);

    const result = await ipcMain.invoke(
      IPC_CHANNELS.linksOpenExternal,
      "https://example.test",
    );

    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith(
      "https://example.test",
    );
    expect(result).toBe(true);
  });

  it("地址不是字符串时被拒绝且不触达打开器", () => {
    const ipcMain = createFakeIpcMain();
    const openExternalLink = vi.fn(() => Promise.resolve(true));
    registerLinkIpc(ipcMain, openExternalLink);

    for (const url of [undefined, null, 1, {}, ["https://a.test"]]) {
      expect(() => ipcMain.invoke(IPC_CHANNELS.linksOpenExternal, url)).toThrow(
        "无效的链接地址",
      );
    }
    expect(openExternalLink).not.toHaveBeenCalled();
  });
});
