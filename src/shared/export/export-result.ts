import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationFailed,
  operationSucceeded,
  type OperationFailure,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 导出操作失败的原因.
 */
export type ExportFailureReason =
  | DatabaseFailureReason
  | "invalid-input"
  | "busy"
  | "too-many-entries"
  | "no-entries"
  | "wrong-master-password"
  | "invalid-passphrase"
  | "plaintext-not-acknowledged"
  | "write-failed"
  | "attachment-missing"
  | "no-finished-export"
  | "reveal-failed";

/**
 * 导出操作成功的结果.
 */
export type ExportSuccess<Value> = OperationSuccess<Value>;

/**
 * 导出操作失败的结果.
 */
export type ExportFailure = OperationFailure<ExportFailureReason>;

/**
 * 导出操作的结果: 带值的成功, 或带原因的失败.
 */
export type ExportResult<Value> = ExportSuccess<Value> | ExportFailure;

/**
 * 构造表示导出操作成功的结果.
 */
export const exportSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示导出操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function exportFailed(reason: ExportFailureReason): ExportFailure {
  return operationFailed(reason);
}
