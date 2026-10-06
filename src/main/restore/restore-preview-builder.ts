import type {
  RestorePreview,
  RestoreVaultState,
} from "@shared/restore/restore-types";

import type { ValidatedBackup } from "./restore-backup-types";

/**
 * 生成预览需要的备份之外的信息.
 */
export interface RestorePreviewContext {
  /**
   * 备份文件是否用口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 保险库现在的内容个数.
   */
  readonly vault: RestoreVaultState;
  /**
   * 恢复前是否要重新输入主密码.
   */
  readonly requiresMasterPassword: boolean;
}

/**
 * 由校验后的备份生成给渲染端看的概要. 只含计数与标志, 不含任何条目, 附件与路径.
 * @param backup 校验后的备份.
 * @param context 加密与否, 保险库现状与主密码要求.
 * @returns 预览概要.
 */
export function buildRestorePreview(
  backup: ValidatedBackup,
  context: RestorePreviewContext,
): RestorePreview {
  const { manifest, document } = backup;
  return {
    createdAt: manifest.createdAt,
    isEncrypted: context.isEncrypted,
    entryCount: document.entries.length,
    folderCount: document.folders.length,
    tagCount: document.tags.length,
    customTypeCount: document.customEntryTypes.length,
    attachmentCount: backup.attachments.size,
    attachmentBytes: backup.attachmentBytes,
    includesSecrets: manifest.includesSecrets,
    includesAttachments: manifest.includesAttachments,
    vault: context.vault,
    requiresMasterPassword: context.requiresMasterPassword,
  };
}
