import { useCallback } from "react";

import type { EmailBackupProgressSnapshot } from "@shared/email-backup/email-backup-progress";

import { usePolledValue } from "@renderer/components/use-polled-value";
import { useEmailBackupBridge } from "@renderer/stores/use-email-backup-bridge";

/**
 * 轮询邮箱备份进度的间隔, 单位毫秒.
 */
export const EMAIL_BACKUP_PROGRESS_POLL_MILLISECONDS = 150;

/**
 * 在主进程备份期间定期读取邮箱备份进度. 进度通过请求应答读取, 不依赖主进程推送.
 * @param isActive 是否正在备份, 为假时不轮询.
 * @returns 最近一次读到的进度快照, 没有备份或还没读到时为 undefined.
 */
export function useEmailBackupProgress(
  isActive: boolean,
): EmailBackupProgressSnapshot | undefined {
  const bridge = useEmailBackupBridge();
  const read = useCallback(() => bridge.getProgress(), [bridge]);
  return usePolledValue(
    isActive,
    read,
    EMAIL_BACKUP_PROGRESS_POLL_MILLISECONDS,
  );
}
