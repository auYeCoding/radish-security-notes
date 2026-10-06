import type { RestoreLimits } from "@shared/restore/restore-limits";
import type { RestoreResult } from "@shared/restore/restore-result";

import {
  openBackupArchive,
  type BackupArchiveSource,
} from "./backup-archive-opener";
import { readBackupArchive } from "./backup-archive-reader";
import { decryptBackup } from "./backup-decryption";
import type { ValidatedBackup } from "./restore-backup-types";
import { validateBackup } from "./restore-backup-validator";
import type { RestoreFilePort } from "./restore-ports";
import type { RestoreProgressTracker } from "./restore-progress";

/**
 * 读出备份用到的依赖.
 */
export interface RestoreIntakeDependencies {
  /**
   * 文件系统能力.
   */
  readonly file: RestoreFilePort;
  /**
   * 读取上限.
   */
  readonly limits: RestoreLimits;
  /**
   * 进度记录器.
   */
  readonly tracker: RestoreProgressTracker;
}

/**
 * 打开压缩包, 读出全部内容并校验. 压缩包读完后一定关闭.
 * @param source 压缩包的来源.
 * @param dependencies 读出备份用到的依赖.
 * @returns 校验后的备份; 不是备份文件, 内容不合规或超限时为失败结果.
 * @throws BackupDamagedError 当压缩包损坏时.
 */
async function unpackAndValidate(
  source: BackupArchiveSource,
  dependencies: RestoreIntakeDependencies,
): Promise<RestoreResult<ValidatedBackup>> {
  const { tracker, limits } = dependencies;
  tracker.begin("unpacking");
  const zipFile = await openBackupArchive(source);
  try {
    const raw = await readBackupArchive(zipFile, limits, tracker.advance);
    if (!raw.ok) {
      return raw;
    }
    tracker.begin("validating");
    return validateBackup(raw.value);
  } finally {
    zipFile.close();
  }
}

/**
 * 读出未加密的备份: 压缩包按需从磁盘读取, 不整体进内存.
 * @param filePath 备份文件的路径.
 * @param dependencies 读出备份用到的依赖.
 * @returns 校验后的备份; 失败时为失败结果.
 * @throws BackupDamagedError 当压缩包损坏时.
 */
export function readPlainBackup(
  filePath: string,
  dependencies: RestoreIntakeDependencies,
): Promise<RestoreResult<ValidatedBackup>> {
  return unpackAndValidate({ kind: "path", path: filePath }, dependencies);
}

/**
 * 读出口令加密的备份: 边读文件边解密到内存, 再按压缩包读取并校验, 不产生明文临时文件.
 * @param filePath 备份文件的路径.
 * @param passphrase 加密口令, 只用于这一次调用.
 * @param dependencies 读出备份用到的依赖.
 * @returns 校验后的备份; 失败时为失败结果.
 * @throws WrongPassphraseError 当口令不对时.
 * @throws BackupDamagedError 当文件或压缩包损坏时.
 * @throws RestoreLimitExceededError 当解密后的字节超过上限时.
 */
export async function readEncryptedBackup(
  filePath: string,
  passphrase: string,
  dependencies: RestoreIntakeDependencies,
): Promise<RestoreResult<ValidatedBackup>> {
  dependencies.tracker.begin("decrypting");
  const bytes = await decryptBackup(
    dependencies.file.openStream(filePath),
    passphrase,
    dependencies.limits.maxFileBytes,
  );
  return unpackAndValidate({ kind: "bytes", bytes }, dependencies);
}
