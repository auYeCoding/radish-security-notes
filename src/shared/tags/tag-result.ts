import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationResult,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 标签操作失败的原因.
 */
export type TagFailureReason =
  DatabaseFailureReason | "invalid-input" | "not-found" | "name-taken";

/**
 * 标签操作成功的结果.
 */
export type TagSuccess<Value> = OperationSuccess<Value>;

/**
 * 标签操作失败的结果.
 */
export type TagFailure = OperationFailure<TagFailureReason>;

/**
 * 标签操作的结果: 带值的成功, 或带原因的失败.
 */
export type TagResult<Value> = OperationResult<Value, TagFailureReason>;

/**
 * 构造表示标签操作成功的结果.
 */
export const tagSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示标签操作失败的结果.
 */
export const tagFailed: (reason: TagFailureReason) => TagFailure =
  operationFailed;
