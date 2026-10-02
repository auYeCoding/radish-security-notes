import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { QrImageDecoder } from "../entries/qr-decoder";
import type { TotpService } from "../entries/totp-service";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 校验渲染进程传来的条目编号是字符串.
 * @param id 渲染进程传来的值.
 * @returns 校验通过的条目编号.
 * @throws Error 当参数不是字符串时.
 */
function requireEntryIdentifier(id: unknown): string {
  if (typeof id !== "string") {
    throw new Error("无效的条目编号");
  }
  return id;
}

/**
 * 校验渲染进程传来的图片是字节数组.
 * @param image 渲染进程传来的值.
 * @returns 校验通过的图片字节.
 * @throws Error 当参数不是字节数组时.
 */
function requireImageBytes(image: unknown): Uint8Array {
  if (!(image instanceof Uint8Array)) {
    throw new Error("无效的图片内容");
  }
  return image;
}

/**
 * 注册 TOTP 相关的 IPC 通道, 参数在进程边界处校验类型后才交给服务与解码器.
 * @param ipcMain 主进程 IPC 接口.
 * @param service TOTP 服务.
 * @param decodeQrImage 二维码图片解码器.
 */
export function registerTotpIpc(
  ipcMain: IpcMainPort,
  service: TotpService,
  decodeQrImage: QrImageDecoder,
): void {
  ipcMain.handle(IPC_CHANNELS.totpGetCode, (_event, id) =>
    service.getCode(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.totpRevealSecret, (_event, id) =>
    service.revealSecret(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.totpCopyCode, (_event, id) =>
    service.copyCode(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.totpCopySecret, (_event, id) =>
    service.copySecret(requireEntryIdentifier(id)),
  );
  ipcMain.handle(IPC_CHANNELS.totpDecodeQrImage, (_event, image) =>
    decodeQrImage(requireImageBytes(image)),
  );
}
