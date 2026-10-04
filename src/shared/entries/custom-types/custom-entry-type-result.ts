import type { DatabaseFailureReason } from "../../result/database-failure-reason";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationResult,
  type OperationSuccess,
} from "../../result/operation-result";

/**
 * 自定义类型操作失败的原因: 数据库原因, 内容不合规, 与已有类型重名, 自定义类型个数已达上限.
 */
export type CustomEntryTypeFailureReason =
  DatabaseFailureReason | "invalid-input" | "name-taken" | "limit-reached";

/**
 * 自定义类型操作成功的结果.
 */
export type CustomEntryTypeSuccess<Value> = OperationSuccess<Value>;

/**
 * 自定义类型操作失败的结果.
 */
export type CustomEntryTypeFailure =
  OperationFailure<CustomEntryTypeFailureReason>;

/**
 * 自定义类型操作的结果: 带值的成功, 或带原因的失败.
 */
export type CustomEntryTypeResult<Value> = OperationResult<
  Value,
  CustomEntryTypeFailureReason
>;

/**
 * 构造表示自定义类型操作成功的结果.
 */
export const customEntryTypeSucceeded: typeof operationSucceeded =
  operationSucceeded;

/**
 * 构造表示自定义类型操作失败的结果.
 */
export const customEntryTypeFailed: (
  reason: CustomEntryTypeFailureReason,
) => CustomEntryTypeFailure = operationFailed;
