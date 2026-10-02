import { randomUUID } from "node:crypto";

import { clipboard } from "electron";

import { EntryService } from "../entries/entry-service";
import {
  createQrDecoder,
  resolveZxingWasmFile,
  type QrImageDecoder,
} from "../entries/qr-decoder";
import { TotpService } from "../entries/totp-service";
import type { VaultService } from "../vault/vault-service";

/**
 * 条目相关的运行时对象.
 */
export interface EntryRuntime {
  /**
   * 条目服务.
   */
  readonly service: EntryService;
  /**
   * TOTP 服务.
   */
  readonly totpService: TotpService;
  /**
   * 二维码图片解码器.
   */
  readonly decodeQrImage: QrImageDecoder;
}

/**
 * 把条目的意外失败写入控制台. 只输出错误名称, 不输出错误信息与底层原因, 避免条目内容
 * 经错误信息进入日志.
 * @param error 底层错误.
 */
function reportEntryFailure(error: unknown): void {
  const name = error instanceof Error ? error.name : "未知错误";
  console.error(`[条目] 操作失败, ${name}`);
}

/**
 * 创建条目运行时对象: 条目服务与 TOTP 服务读写保险库已解锁的加密数据库, 复制时写入系统
 * 剪贴板; 二维码解码器在主进程里用 zxing-wasm 解码图片.
 * @param vault 保险库服务.
 * @returns 条目运行时对象.
 */
export function createEntryRuntime(vault: VaultService): EntryRuntime {
  const service = new EntryService({
    getOrm: () => vault.getOrm(),
    clipboard,
    createIdentifier: randomUUID,
    now: Date.now,
    onFailure: reportEntryFailure,
  });
  const totpService = new TotpService({
    getOrm: () => vault.getOrm(),
    clipboard,
    now: Date.now,
    onFailure: reportEntryFailure,
  });
  const decodeQrImage = createQrDecoder({
    wasmFile: resolveZxingWasmFile(),
    onFailure: reportEntryFailure,
  });
  return { service, totpService, decodeQrImage };
}
