import { randomUUID } from "node:crypto";

import { FolderService } from "../folders/folder-service";
import type { VaultService } from "../vault/vault-service";

/**
 * 把文件夹的意外失败写入控制台. 只输出错误名称, 不输出错误信息与底层原因, 避免文件夹名经
 * 错误信息进入日志.
 * @param error 底层错误.
 */
function reportFolderFailure(error: unknown): void {
  const name = error instanceof Error ? error.name : "未知错误";
  console.error(`[文件夹] 操作失败, ${name}`);
}

/**
 * 创建文件夹服务: 读写保险库已解锁的加密数据库.
 * @param vault 保险库服务.
 * @returns 文件夹服务.
 */
export function createFolderService(vault: VaultService): FolderService {
  return new FolderService({
    getOrm: () => vault.getOrm(),
    createIdentifier: randomUUID,
    now: Date.now,
    onFailure: reportFolderFailure,
  });
}
