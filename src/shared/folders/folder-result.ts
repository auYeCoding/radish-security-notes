import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationResult,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 文件夹操作失败的原因.
 */
export type FolderFailureReason =
  DatabaseFailureReason | "invalid-input" | "not-found" | "name-taken";

/**
 * 文件夹操作成功的结果.
 */
export type FolderSuccess<Value> = OperationSuccess<Value>;

/**
 * 文件夹操作失败的结果.
 */
export type FolderFailure = OperationFailure<FolderFailureReason>;

/**
 * 文件夹操作的结果: 带值的成功, 或带原因的失败.
 */
export type FolderResult<Value> = OperationResult<Value, FolderFailureReason>;

/**
 * 构造表示文件夹操作成功的结果.
 */
export const folderSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示文件夹操作失败的结果.
 */
export const folderFailed: (reason: FolderFailureReason) => FolderFailure =
  operationFailed;
