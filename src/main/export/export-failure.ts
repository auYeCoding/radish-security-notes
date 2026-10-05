import type { ExportFailureReason } from "@shared/export/export-result";

import {
  ExportAttachmentMissingError,
  ExportCancelledError,
} from "./export-errors";

/**
 * 判断一个错误是否是用户取消导出引起的: 序列化器抛出的取消错误, 或写文件流程被中止信号中止.
 * @param error 抛出的错误.
 * @returns 是取消引起的时返回 true.
 */
export function isExportCancellation(error: unknown): boolean {
  return (
    error instanceof ExportCancelledError ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * 判断一个错误是否是文件系统错误: 带 `E` 开头的错误码, 如 `EACCES`, `ENOSPC`, `EPERM`.
 * @param error 抛出的错误.
 * @returns 是文件系统错误时返回 true.
 */
function isFileSystemError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  return typeof error.code === "string" && error.code.startsWith("E");
}

/**
 * 把导出过程中抛出的错误换成失败原因: 附件缺失与文件系统错误各有原因, 其余是意外失败.
 * @param error 抛出的错误.
 * @returns 失败原因.
 */
export function failureReasonOf(error: unknown): ExportFailureReason {
  if (error instanceof ExportAttachmentMissingError) {
    return "attachment-missing";
  }
  return isFileSystemError(error) ? "write-failed" : "unexpected-error";
}
