import { exportFileExtension } from "@shared/export/export-format-capabilities";

import { EXPORT_FILE_NAME_PREFIX } from "../export/export-file-name";
import { formatLocalIsoDate } from "../recovery/local-iso-date";

/**
 * 邮箱备份文件的名称: 应用名, `backup`, 本地日期与本应用格式的扩展名, 加密时再追加加密扩展名, 如
 * `radish-security-notes-backup-2026-10-05.zip.age`.
 * @param isEncrypted 是否口令加密.
 * @param date 备份的日期.
 * @returns 备份文件名.
 */
export function backupFileName(isEncrypted: boolean, date: Date): string {
  return `${EXPORT_FILE_NAME_PREFIX}-backup-${formatLocalIsoDate(date)}.${exportFileExtension("native", isEncrypted)}`;
}
