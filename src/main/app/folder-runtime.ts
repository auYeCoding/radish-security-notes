import { randomUUID } from "node:crypto";

import { FolderService } from "../folders/folder-service";
import type { VaultService } from "../vault/vault-service";
import { reportFailureName } from "./report-failure-name";

/**
 * 文件夹失败日志的前缀.
 */
const FOLDER_FAILURE_SCOPE = "文件夹";

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
    onFailure: (error) => reportFailureName(FOLDER_FAILURE_SCOPE, error),
  });
}
