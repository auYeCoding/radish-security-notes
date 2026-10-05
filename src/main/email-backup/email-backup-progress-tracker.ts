import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";

import {
  createExportProgressTracker,
  type ExportProgressTracker,
} from "../export/export-progress";

/**
 * 邮箱备份进度的记录器: 生成备份文件的阶段沿用导出的进度记录器, 之后是发送阶段.
 */
export interface EmailBackupProgressTracker {
  /**
   * 生成备份文件时用的进度记录器.
   */
  readonly generation: ExportProgressTracker;
  /**
   * 进入发送阶段.
   */
  readonly beginSending: () => void;
  /**
   * 回到空闲状态.
   */
  readonly reset: () => void;
  /**
   * 读取当前进度的快照.
   * @returns 进度快照.
   */
  readonly snapshot: () => EmailBackupProgressSnapshot;
}

/**
 * 发送阶段的进度, 没有细分进度.
 */
const SENDING_PROGRESS: EmailBackupProgressSnapshot = {
  stage: "sending",
  processed: 0,
  total: 0,
};

/**
 * 创建邮箱备份进度记录器, 初始是空闲状态.
 * @returns 进度记录器.
 */
export function createEmailBackupProgressTracker(): EmailBackupProgressTracker {
  const generation = createExportProgressTracker();
  let isSending = false;
  return {
    generation,
    beginSending: () => {
      isSending = true;
    },
    reset: () => {
      isSending = false;
      generation.reset();
    },
    snapshot: () => (isSending ? SENDING_PROGRESS : generation.snapshot()),
  };
}
