import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createTotpBridge } from "./create-totp-bridge";

describe("createTotpBridge", () => {
  it("getCode 调用取码通道并返回结果", async () => {
    const code = { code: "123456", expiresAt: 60000, periodSeconds: 30 };
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: code }));

    const result = await createTotpBridge({ invoke }).getCode("id-1");

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.totpGetCode, "id-1");
    expect(result).toEqual({ ok: true, value: code });
  });

  it("revealSecret 调用读密钥通道并带上编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true, value: "SECRET" }));

    const result = await createTotpBridge({ invoke }).revealSecret("id-1");

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.totpRevealSecret, "id-1");
    expect(result).toEqual({ ok: true, value: "SECRET" });
  });

  it("copyCode 与 copySecret 调用各自的复制通道并带上编号", async () => {
    const invoke = vi.fn(() => Promise.resolve({ ok: true }));
    const bridge = createTotpBridge({ invoke });

    await bridge.copyCode("id-1");
    await bridge.copySecret("id-2");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.totpCopyCode,
      "id-1",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.totpCopySecret,
      "id-2",
    );
  });

  it("decodeQrImage 调用解码通道并带上图片字节", async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({ ok: false, reason: "invalid-input" }),
    );
    const image = Uint8Array.from([1, 2, 3]);

    const result = await createTotpBridge({ invoke }).decodeQrImage(image);

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.totpDecodeQrImage, image);
    expect(result).toEqual({ ok: false, reason: "invalid-input" });
  });
});
