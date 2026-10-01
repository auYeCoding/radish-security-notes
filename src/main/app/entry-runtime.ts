import { randomUUID } from "node:crypto";

import { clipboard } from "electron";

import { EntryService } from "../entries/entry-service";
import type { VaultService } from "../vault/vault-service";

/**
 * 条目相关的运行时对象.
 */
export interface EntryRuntime {
  /**
   * 条目服务.
   */
  readonly service: EntryService;
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
 * 创建条目运行时对象: 条目服务读写保险库已解锁的加密数据库, 复制时写入系统剪贴板.
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
  return { service };
}
