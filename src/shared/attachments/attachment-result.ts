import type { DatabaseFailureReason } from "../result/database-failure-reason";
import {
  operationSucceeded,
  type OperationFailure,
  type OperationSuccess,
} from "../result/operation-result";

/**
 * 附件操作失败的原因.
 */
export type AttachmentFailureReason =
  | DatabaseFailureReason
  | "invalid-input"
  | "not-found"
  | "empty-file"
  | "file-too-large"
  | "too-many-attachments"
  | "total-too-large"
  | "not-a-file"
  | "read-failed"
  | "write-failed"
  | "not-openable"
  | "not-previewable"
  | "open-failed";

/**
 * 附件操作成功的结果.
 */
export type AttachmentSuccess<Value> = OperationSuccess<Value>;

/**
 * 附件操作失败的结果. 失败与某个文件有关时带文件名, 文件名只用于界面提示, 不进日志.
 */
export interface AttachmentFailure extends OperationFailure<AttachmentFailureReason> {
  /**
   * 导致失败的文件名, 失败与具体文件无关时没有这一项.
   */
  readonly fileName?: string;
}

/**
 * 附件操作的结果: 带值的成功, 或带原因的失败.
 */
export type AttachmentResult<Value> =
  AttachmentSuccess<Value> | AttachmentFailure;

/**
 * 构造表示附件操作成功的结果.
 */
export const attachmentSucceeded: typeof operationSucceeded =
  operationSucceeded;

/**
 * 构造表示附件操作失败的结果.
 * @param reason 失败的原因.
 * @param fileName 导致失败的文件名, 与具体文件无关时省略.
 * @returns 带原因的失败结果.
 */
export function attachmentFailed(
  reason: AttachmentFailureReason,
  fileName?: string,
): AttachmentFailure {
  return fileName === undefined
    ? { ok: false, reason }
    : { ok: false, reason, fileName };
}
