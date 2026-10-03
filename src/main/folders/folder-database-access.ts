import { folderFailed, type FolderResult } from "@shared/folders/folder-result";

import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 在已解锁的数据库上执行文件夹操作需要的依赖.
 */
export interface FolderDatabaseAccess {
  /**
   * 取已解锁数据库的查询入口, 未解锁时返回 undefined.
   */
  readonly getOrm: () => VaultOrm | undefined;
  /**
   * 操作意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 在已解锁的数据库上执行一个文件夹操作. 未解锁时返回失败结果; 操作抛出错误时通知回调, 并返回
 * 意外错误的失败结果.
 * @param access 取数据库与报告失败的依赖.
 * @param operation 要执行的操作.
 * @returns 操作结果.
 */
export function runWithFolderDatabase<Value>(
  access: FolderDatabaseAccess,
  operation: (orm: VaultOrm) => FolderResult<Value>,
): FolderResult<Value> {
  const orm = access.getOrm();
  if (orm === undefined) {
    return folderFailed("vault-locked");
  }
  try {
    return operation(orm);
  } catch (error) {
    access.onFailure(error);
    return folderFailed("unexpected-error");
  }
}
