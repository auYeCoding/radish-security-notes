import {
  restoreFailed,
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type { RestoreProblem } from "@shared/restore/restore-problem";

import type { RawBackupArchive } from "./backup-archive-reader";
import type {
  RestoreVaultDocument,
  ValidatedBackup,
} from "./restore-backup-types";
import { validateAttachments } from "./restore-attachment-validator";
import { validateCustomTypes } from "./restore-custom-type-validator";
import { parseVaultDocument } from "./restore-document-parser";
import { validateEntries } from "./restore-entry-validator";
import { validateFolders, validateTags } from "./restore-label-validator";
import {
  checkManifestCounts,
  parseManifest,
} from "./restore-manifest-validator";
import type { NativeManifest } from "../export/serializers/native/native-format-types";

/**
 * 按顺序运行各项内容检查, 返回第一个发现的问题.
 * @param manifest 清单.
 * @param document 保险库数据.
 * @param attachments 压缩包里的附件内容.
 * @returns 第一个问题, 没有问题时为 undefined.
 */
function findFirstProblem(
  manifest: NativeManifest,
  document: RestoreVaultDocument,
  attachments: ReadonlyMap<string, Buffer>,
): RestoreProblem | undefined {
  return (
    checkManifestCounts(manifest, document) ??
    validateFolders(document.folders) ??
    validateTags(document.tags) ??
    validateCustomTypes(document.customEntryTypes) ??
    validateEntries(document) ??
    validateAttachments(document, attachments)
  );
}

/**
 * 校验读出的备份: 清单, 保险库数据结构, 清单计数, 文件夹, 标签, 自定义类型, 条目与附件.
 * 任何不合规整体拒绝, 失败结果带第一个问题; 校验通过才得到可以恢复的备份.
 * @param raw 从压缩包读出的内容.
 * @returns 校验后的备份; 不是备份文件, 版本更新, 内容不合规或超限时为失败结果.
 */
export function validateBackup(
  raw: RawBackupArchive,
): RestoreResult<ValidatedBackup> {
  const manifest = parseManifest(raw.manifest);
  if (!manifest.ok) {
    return manifest;
  }
  const document = parseVaultDocument(raw.vault);
  if (!document.ok) {
    return document;
  }
  const problem = findFirstProblem(
    manifest.value,
    document.value,
    raw.attachments,
  );
  if (problem !== undefined) {
    return restoreFailed("invalid-content", problem);
  }
  const attachmentBytes = Array.from(raw.attachments.values()).reduce(
    (total, content) => total + content.length,
    0,
  );
  return restoreSucceeded({
    manifest: manifest.value,
    document: document.value,
    attachments: raw.attachments,
    attachmentBytes,
  });
}
