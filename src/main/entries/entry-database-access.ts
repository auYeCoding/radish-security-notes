import { entryFailed, type EntryResult } from "@shared/entries/entry-result";

import type { VaultOrm } from "../vault/database/drizzle-adapter";

/**
 * 在已解锁的数据库上执行条目操作需要的依赖.
 */
export interface EntryDatabaseAccess {
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
 * 在已解锁的数据库上执行一个操作. 未解锁时返回失败结果; 操作抛出错误时通知回调, 并返回
 * 意外错误的失败结果.
 * @param access 取数据库与报告失败的依赖.
 * @param operation 要执行的操作.
 * @returns 操作结果.
 */
export function runWithEntryDatabase<Value>(
  access: EntryDatabaseAccess,
  operation: (orm: VaultOrm) => EntryResult<Value>,
): EntryResult<Value> {
  const orm = access.getOrm();
  if (orm === undefined) {
    return entryFailed("vault-locked");
  }
  try {
    return operation(orm);
  } catch (error) {
    access.onFailure(error);
    return entryFailed("unexpected-error");
  }
}
