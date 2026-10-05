import { exportFileExtension } from "@shared/export/export-format-capabilities";
import type { ExportFormatKey } from "@shared/export/export-format-keys";

import { formatLocalIsoDate } from "../recovery/local-iso-date";

/**
 * 导出文件默认名称的前缀.
 */
const EXPORT_FILE_NAME_PREFIX = "radish-security-notes";

/**
 * 保存对话框里预填的默认文件名: 应用名, 本地日期与格式的扩展名, 加密时再追加加密扩展名, 如
 * `radish-security-notes-2026-10-05.zip.age`.
 * @param format 导出格式.
 * @param isEncrypted 是否口令加密.
 * @param date 导出的日期.
 * @returns 默认文件名.
 */
export function defaultExportFileName(
  format: ExportFormatKey,
  isEncrypted: boolean,
  date: Date,
): string {
  return `${EXPORT_FILE_NAME_PREFIX}-${formatLocalIsoDate(date)}.${exportFileExtension(format, isEncrypted)}`;
}
