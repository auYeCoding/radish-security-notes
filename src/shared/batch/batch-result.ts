import type { EntryFailureReason } from "../entries/entry-result";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationResult,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 批量操作失败的原因: 在条目操作的失败原因之外, 多一个加标签后某个条目的标签数超过上限.
 */
export type BatchFailureReason = EntryFailureReason | "tag-limit-exceeded";

/**
 * 批量操作成功的结果.
 */
export type BatchSuccess<Value> = OperationSuccess<Value>;

/**
 * 批量操作失败的结果.
 */
export type BatchFailure = OperationFailure<BatchFailureReason>;

/**
 * 批量操作的结果: 带值的成功, 或带原因的失败. 失败时整个操作都没有生效.
 */
export type BatchResult<Value> = OperationResult<Value, BatchFailureReason>;

/**
 * 构造表示批量操作成功的结果.
 */
export const batchSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示批量操作失败的结果.
 */
export const batchFailed: (reason: BatchFailureReason) => BatchFailure =
  operationFailed;
