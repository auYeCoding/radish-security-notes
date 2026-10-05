import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationSucceeded,
  type OperationFailure,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 导入操作失败的原因.
 */
export type ImportFailureReason =
  | DatabaseFailureReason
  | "invalid-input"
  | "busy"
  | "no-pending-import"
  | "file-unreadable"
  | "file-empty"
  | "file-too-large"
  | "encoding-unsupported"
  | "format-mismatch"
  | "encrypted-file"
  | "organization-export-unsupported"
  | "malformed-file"
  | "too-many-entries"
  | "no-importable-entries"
  | "save-failed"
  | "reveal-failed";

/**
 * 导入操作成功的结果.
 */
export type ImportSuccess<Value> = OperationSuccess<Value>;

/**
 * 导入操作失败的结果. 文件格式错误与某一行有关时带行号, 行号不含文件内容, 只用于界面提示.
 */
export interface ImportFailure extends OperationFailure<ImportFailureReason> {
  /**
   * 出错的行号, 从 1 起, 与具体行无关时没有这一项.
   */
  readonly line?: number;
}

/**
 * 导入操作的结果: 带值的成功, 或带原因的失败.
 */
export type ImportResult<Value> = ImportSuccess<Value> | ImportFailure;

/**
 * 构造表示导入操作成功的结果.
 */
export const importSucceeded: typeof operationSucceeded = operationSucceeded;

/**
 * 构造表示导入操作失败的结果.
 * @param reason 失败的原因.
 * @param line 出错的行号, 与具体行无关时省略.
 * @returns 带原因的失败结果.
 */
export function importFailed(
  reason: ImportFailureReason,
  line?: number,
): ImportFailure {
  return line === undefined
    ? { ok: false, reason }
    : { ok: false, reason, line };
}
