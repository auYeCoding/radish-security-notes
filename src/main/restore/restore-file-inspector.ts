import type { RestoreLimits } from "@shared/restore/restore-limits";
import {
  restoreFailed,
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";

import {
  BACKUP_FILE_HEAD_BYTES,
  detectBackupFileKind,
} from "./backup-file-kind";
import type { RestoreFilePort } from "./restore-ports";

/**
 * 检查过的备份文件: 种类与字节数.
 */
export interface InspectedBackupFile {
  /**
   * 文件的种类, 明文压缩包或口令加密文件.
   */
  readonly kind: "zip" | "encrypted";
  /**
   * 文件的字节数.
   */
  readonly fileSizeBytes: number;
}

/**
 * 检查用户选定的文件, 不读取内容之外的东西: 必须是普通文件, 大小不超过上限, 开头的魔数是压缩包
 * 或 age 加密文件. 按文件内容判断, 不看扩展名.
 * @param filePath 文件路径.
 * @param file 文件系统能力.
 * @param limits 读取上限.
 * @returns 文件的种类与大小; 读不了, 太大, 或不是备份文件时为失败结果.
 */
export async function inspectBackupFile(
  filePath: string,
  file: RestoreFilePort,
  limits: RestoreLimits,
): Promise<RestoreResult<InspectedBackupFile>> {
  try {
    const facts = await file.statFile(filePath);
    if (!facts.isFile) {
      return restoreFailed("file-unreadable");
    }
    if (facts.size > limits.maxFileBytes) {
      return restoreFailed("file-too-large");
    }
    const kind = detectBackupFileKind(
      await file.readHead(filePath, BACKUP_FILE_HEAD_BYTES),
    );
    return kind === "unknown"
      ? restoreFailed("not-a-backup")
      : restoreSucceeded({ kind, fileSizeBytes: facts.size });
  } catch {
    return restoreFailed("file-unreadable");
  }
}
