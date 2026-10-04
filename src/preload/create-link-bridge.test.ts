import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createLinkBridge } from "./create-link-bridge";

describe("createLinkBridge", () => {
  it("openExternal 调用打开通道并带上地址, 主进程返回 true 时兑现 true", async () => {
    const invoke = vi.fn(() => Promise.resolve(true));

    const result = await createLinkBridge({ invoke }).openExternal(
      "https://example.test",
    );

    expect(invoke).toHaveBeenCalledExactlyOnceWith(
      IPC_CHANNELS.linksOpenExternal,
      "https://example.test",
    );
    expect(result).toBe(true);
  });

  it("主进程返回 false 或其它值时兑现 false", async () => {
    for (const reply of [false, undefined, null, "true", 1]) {
      const invoke = vi.fn(() => Promise.resolve(reply));

      const result = await createLinkBridge({ invoke }).openExternal(
        "https://example.test",
      );

      expect(result).toBe(false);
    }
  });
});
