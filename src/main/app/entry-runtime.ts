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
import { reportFailureName } from "./report-failure-name";

/**
 * 条目失败日志的前缀.
 */
const ENTRY_FAILURE_SCOPE = "条目";

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
 * 创建条目运行时对象: 条目服务与 TOTP 服务读写保险库已解锁的加密数据库, 复制时写入系统
 * 剪贴板; 二维码解码器在主进程里用 zxing-wasm 解码图片.
 * @param vault 保险库服务.
 * @returns 条目运行时对象.
 */
export function createEntryRuntime(vault: VaultService): EntryRuntime {
  const onFailure = (error: unknown): void =>
    reportFailureName(ENTRY_FAILURE_SCOPE, error);
  const service = new EntryService({
    getOrm: () => vault.getOrm(),
    clipboard,
    createIdentifier: randomUUID,
    now: Date.now,
    onFailure,
  });
  const totpService = new TotpService({
    getOrm: () => vault.getOrm(),
    clipboard,
    now: Date.now,
    onFailure,
  });
  const decodeQrImage = createQrDecoder({
    wasmFile: resolveZxingWasmFile(),
    onFailure,
  });
  return { service, totpService, decodeQrImage };
}
