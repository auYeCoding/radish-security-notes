import type { DatabaseFailureReason } from "@shared/result/database-failure-reason";
import {
  operationFailed,
  type OperationResult,
} from "@shared/result/operation-result";

import type { VaultOrm } from "./drizzle-adapter";

/**
 * 在已解锁的数据库上执行操作需要的依赖.
 */
export interface DatabaseAccess {
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
export function runWithDatabase<Value, Reason extends string>(
  access: DatabaseAccess,
  operation: (orm: VaultOrm) => OperationResult<Value, Reason>,
): OperationResult<Value, Reason | DatabaseFailureReason> {
  const orm = access.getOrm();
  if (orm === undefined) {
    return operationFailed("vault-locked");
  }
  try {
    return operation(orm);
  } catch (error) {
    access.onFailure(error);
    return operationFailed("unexpected-error");
  }
}
