import { useCallback } from "react";

import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

import { usePolledValue } from "@renderer/components/use-polled-value";
import { useEmailBackupBridge } from "@renderer/stores/use-email-backup-bridge";

/**
 * 侧栏入口检查自动备份是否失败的间隔: 一分钟.
 */
export const AUTO_BACKUP_FAILURE_POLL_MILLISECONDS = 60 * 1000;

/**
 * 在邮箱备份对话框关闭期间定期读取自动备份最近一次失败的原因, 供侧栏入口显示失败标记. 对话框打开时
 * 不轮询 (对话框里自己显示原因), 关闭后立即读取一次. 读取失败 (例如保险库未解锁) 当作没有失败.
 * @param isDialogOpen 邮箱备份对话框是否打开.
 * @returns 最近一次自动备份失败的原因, 没有失败, 还没读到或对话框打开时为 undefined.
 */
export function useAutoBackupFailure(
  isDialogOpen: boolean,
): EmailBackupFailureReason | undefined {
  const bridge = useEmailBackupBridge();
  const read = useCallback(async () => {
    const result = await bridge.getAutoBackup();
    return result.ok ? result.value.lastFailureReason : undefined;
  }, [bridge]);
  return usePolledValue(
    !isDialogOpen,
    read,
    AUTO_BACKUP_FAILURE_POLL_MILLISECONDS,
  );
}
