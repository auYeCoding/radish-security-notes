import { eq } from "drizzle-orm";

import { isEmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupSchedule } from "../vault/database/email-backup-schedule-schema";
import type { AutoBackupSchedule } from "./auto-backup-schedule";
import { EMAIL_BACKUP_ROW_ID } from "./email-backup-row-id";

/**
 * 读取已保存的自动备份计划.
 * @param orm 已解锁数据库的查询入口.
 * @returns 计划, 从没保存过时为 undefined; 失败原因不是登记过的原因码时当作没有原因.
 */
export function readSchedule(orm: VaultOrm): AutoBackupSchedule | undefined {
  const row = orm
    .select()
    .from(emailBackupSchedule)
    .where(eq(emailBackupSchedule.id, EMAIL_BACKUP_ROW_ID))
    .get();
  if (row === undefined) {
    return undefined;
  }
  return {
    isEnabled: row.isEnabled,
    interval: row.intervalKey,
    lastAttemptAt: row.lastAttemptAt ?? undefined,
    failureCount: row.failureCount,
    firstFailureAt: row.firstFailureAt ?? undefined,
    isPaused: row.isPaused,
    lastFailureReason: isEmailBackupFailureReason(row.lastFailureReason)
      ? row.lastFailureReason
      : undefined,
    lastFailureAt: row.lastFailureAt ?? undefined,
  };
}

/**
 * 保存自动备份计划, 已有就覆盖.
 * @param orm 已解锁数据库的查询入口.
 * @param schedule 要保存的计划.
 */
export function writeSchedule(
  orm: VaultOrm,
  schedule: AutoBackupSchedule,
): void {
  const values = {
    isEnabled: schedule.isEnabled,
    intervalKey: schedule.interval,
    lastAttemptAt: schedule.lastAttemptAt ?? null,
    failureCount: schedule.failureCount,
    firstFailureAt: schedule.firstFailureAt ?? null,
    isPaused: schedule.isPaused,
    lastFailureReason: schedule.lastFailureReason ?? null,
    lastFailureAt: schedule.lastFailureAt ?? null,
  };
  orm
    .insert(emailBackupSchedule)
    .values({ id: EMAIL_BACKUP_ROW_ID, ...values })
    .onConflictDoUpdate({ target: emailBackupSchedule.id, set: values })
    .run();
}

/**
 * 读出已保存的计划, 套用一个变换, 写回. 没保存过计划时什么也不做, 不为没用过自动备份的用户新建一行.
 * @param orm 已解锁数据库的查询入口.
 * @param change 对计划的变换.
 */
export function updateExistingSchedule(
  orm: VaultOrm,
  change: (schedule: AutoBackupSchedule) => AutoBackupSchedule,
): void {
  const current = readSchedule(orm);
  if (current !== undefined) {
    writeSchedule(orm, change(current));
  }
}
