import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationResult,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 条目操作失败的原因.
 */
export type EntryFailureReason =
  | DatabaseFailureReason
  | "invalid-input"
  | "not-found"
  | "folder-not-found"
  | "tag-not-found";

/**
 * 条目操作成功的结果.
 */
export type EntrySuccess<Value> = OperationSuccess<Value>;

/**
 * 条目操作失败的结果.
 */
export type EntryFailure = OperationFailure<EntryFailureReason>;

/**
 * 条目操作的结果: 带值的成功, 或带原因的失败.
 */
export type EntryResult<Value> = OperationResult<Value, EntryFailureReason>;

/**
 * 构造表示条目操作成功的结果.
 */
export const entrySucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示条目操作失败的结果.
 */
export const entryFailed: (reason: EntryFailureReason) => EntryFailure =
  operationFailed;
