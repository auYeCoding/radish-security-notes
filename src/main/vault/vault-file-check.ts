import type { VaultFailureCause } from "@shared/vault/vault-failure";

import { hasDatabaseContent } from "./database/database-presence";
import { fileExists } from "./file-exists";
import type { VaultPaths } from "./vault-paths";

/**
 * 密钥文件与数据库文件对不上的两种情形, 取自失败原因.
 */
export type VaultFileProblem = Extract<
  VaultFailureCause,
  "key-file-missing" | "database-missing"
>;

/**
 * 检查密钥文件与数据库文件是否对得上: 有数据库文件却没有密钥文件, 或有密钥文件却没有数据库
 * 文件 (不存在或为空). 两个文件都没有是全新的用户数据目录, 不算问题. 只读文件系统, 不创建,
 * 不覆盖, 不删除任何文件, 调用方据此进入失败状态而不是补建缺的那个文件.
 * @param paths 保险库路径.
 * @param hasKeyRecord 密钥文件是否存在且已读出.
 * @returns 对不上的情形, 对得上或全新目录时为 undefined.
 * @throws Error 当访问文件失败且原因不是文件不存在时.
 */
export async function detectVaultFileProblem(
  paths: VaultPaths,
  hasKeyRecord: boolean,
): Promise<VaultFileProblem | undefined> {
  if (hasKeyRecord) {
    return (await hasDatabaseContent(paths.databaseFile))
      ? undefined
      : "database-missing";
  }
  return (await fileExists(paths.databaseFile))
    ? "key-file-missing"
    : undefined;
}
