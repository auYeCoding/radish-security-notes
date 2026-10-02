import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { QrImageDecoder } from "../entries/qr-decoder";
import type { TotpService } from "../entries/totp-service";
import type { IpcMainPort } from "./preferences-ipc";
import { registerTotpIpc } from "./totp-ipc";

/**
 * 假的主进程 IPC, 记下注册的处理函数以便直接调用.
 */
interface FakeIpcMain extends IpcMainPort {
  /**
   * 调用某个通道上注册的处理函数.
   * @param channel 通道名.
   * @param args 传给处理函数的参数.
   * @returns 处理函数的返回值.
   */
  invoke: (channel: string, ...args: unknown[]) => unknown;
}

/**
 * 创建假的主进程 IPC.
 * @returns 假 IPC.
 */
function createFakeIpcMain(): FakeIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >();
  return {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
    invoke: (channel, ...args) => handlers.get(channel)?.({}, ...args),
  };
}

/**
 * 注册了 TOTP IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假 TOTP 服务.
   */
  readonly service: TotpService;
  /**
   * 假的二维码解码器.
   */
  readonly decodeQrImage: ReturnType<typeof vi.fn<QrImageDecoder>>;
}

/**
 * 注册 TOTP IPC 并返回假 IPC, 假服务与假解码器.
 * @returns 假对象.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = {
    getCode: vi.fn(() => ({ ok: true, value: { code: "123456" } })),
    revealSecret: vi.fn(() => ({ ok: true, value: "SECRET" })),
    copyCode: vi.fn(() => ({ ok: true, value: undefined })),
    copySecret: vi.fn(() => ({ ok: true, value: undefined })),
  } as unknown as TotpService;
  const decodeQrImage = vi.fn<QrImageDecoder>(() =>
    Promise.resolve({ ok: true, value: "otpauth://totp/a?secret=AB" }),
  );
  registerTotpIpc(ipcMain, service, decodeQrImage);
  return { ipcMain, service, decodeQrImage };
}

describe("registerTotpIpc 转发", () => {
  it("取码, 读密钥, 复制验证码, 复制密钥四个通道把条目编号交给服务", () => {
    const { ipcMain, service } = registerWithFakes();

    const code = ipcMain.invoke(IPC_CHANNELS.totpGetCode, "id-1");
    const secret = ipcMain.invoke(IPC_CHANNELS.totpRevealSecret, "id-2");
    ipcMain.invoke(IPC_CHANNELS.totpCopyCode, "id-3");
    ipcMain.invoke(IPC_CHANNELS.totpCopySecret, "id-4");

    expect(code).toEqual({ ok: true, value: { code: "123456" } });
    expect(secret).toEqual({ ok: true, value: "SECRET" });
    expect(service.getCode).toHaveBeenCalledWith("id-1");
    expect(service.revealSecret).toHaveBeenCalledWith("id-2");
    expect(service.copyCode).toHaveBeenCalledWith("id-3");
    expect(service.copySecret).toHaveBeenCalledWith("id-4");
  });

  it("解码通道把图片字节交给解码器并返回它的结果", async () => {
    const { ipcMain, decodeQrImage } = registerWithFakes();
    const image = Uint8Array.from([1, 2, 3]);

    const result = await ipcMain.invoke(IPC_CHANNELS.totpDecodeQrImage, image);

    expect(decodeQrImage).toHaveBeenCalledWith(image);
    expect(result).toEqual({
      ok: true,
      value: "otpauth://totp/a?secret=AB",
    });
  });
});

describe("registerTotpIpc 参数校验", () => {
  it("条目编号不是字符串时被拒绝且不触达服务", () => {
    const { ipcMain, service } = registerWithFakes();

    for (const channel of [
      IPC_CHANNELS.totpGetCode,
      IPC_CHANNELS.totpRevealSecret,
      IPC_CHANNELS.totpCopyCode,
      IPC_CHANNELS.totpCopySecret,
    ]) {
      expect(() => ipcMain.invoke(channel, 1)).toThrow("无效的条目编号");
      expect(() => ipcMain.invoke(channel, undefined)).toThrow(
        "无效的条目编号",
      );
    }
    expect(service.getCode).not.toHaveBeenCalled();
    expect(service.revealSecret).not.toHaveBeenCalled();
    expect(service.copyCode).not.toHaveBeenCalled();
    expect(service.copySecret).not.toHaveBeenCalled();
  });

  it("图片不是字节数组时被拒绝且不触达解码器", () => {
    const { ipcMain, decodeQrImage } = registerWithFakes();

    for (const image of [undefined, null, "text", [1, 2, 3], { length: 3 }]) {
      expect(() =>
        ipcMain.invoke(IPC_CHANNELS.totpDecodeQrImage, image),
      ).toThrow("无效的图片内容");
    }
    expect(decodeQrImage).not.toHaveBeenCalled();
  });

  it("Node 的 Buffer 是字节数组的一种, 可以通过", () => {
    const { ipcMain, decodeQrImage } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.totpDecodeQrImage, Buffer.from([1, 2]));

    expect(decodeQrImage).toHaveBeenCalledTimes(1);
  });
});
