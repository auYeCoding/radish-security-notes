import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationSucceeded,
  type OperationFailure,
  type OperationSuccess,
} from "../result/operation-result";
import type { RestoreProblem } from "./restore-problem";

/**
 * 恢复操作失败的原因.
 */
export type RestoreFailureReason =
  | DatabaseFailureReason
  | "invalid-input"
  | "busy"
  | "no-pending-restore"
  | "file-unreadable"
  | "file-too-large"
  | "not-a-backup"
  | "wrong-passphrase"
  | "damaged-file"
  | "newer-version"
  | "invalid-content"
  | "limit-exceeded"
  | "wrong-master-password"
  | "replace-not-acknowledged";

/**
 * 恢复操作成功的结果.
 */
export type RestoreSuccess<Value> = OperationSuccess<Value>;

/**
 * 恢复操作失败的结果. 内容不合规与超过上限时带第一个问题, 问题只含区段, 种类与位置序号,
 * 不含文件内容与路径.
 */
export interface RestoreFailure extends OperationFailure<RestoreFailureReason> {
  /**
   * 第一个问题, 失败原因与具体问题无关时没有这一项.
   */
  readonly problem?: RestoreProblem;
}

/**
 * 恢复操作的结果: 带值的成功, 或带原因的失败.
 */
export type RestoreResult<Value> = RestoreSuccess<Value> | RestoreFailure;

/**
 * 构造表示恢复操作成功的结果.
 */
export const restoreSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示恢复操作失败的结果.
 * @param reason 失败的原因.
 * @param problem 第一个问题, 与具体问题无关时省略.
 * @returns 带原因的失败结果.
 */
export function restoreFailed(
  reason: RestoreFailureReason,
  problem?: RestoreProblem,
): RestoreFailure {
  return problem === undefined
    ? { ok: false, reason }
    : { ok: false, reason, problem };
}
