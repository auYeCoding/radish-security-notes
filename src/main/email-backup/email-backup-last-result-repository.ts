import { eq } from "drizzle-orm";

import {
  isEmailBackupFailureReason,
  type EmailBackupLastResult,
} from "@shared/email-backup/email-backup-result";
import {
  DEFAULT_EMAIL_BACKUP_TRIGGER_KIND,
  isEmailBackupTriggerKind,
} from "@shared/email-backup/email-backup-trigger-kind";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupLastResults } from "../vault/database/email-backup-last-result-schema";
import { EMAIL_BACKUP_ROW_ID } from "./email-backup-row-id";

/**
 * 读取上次备份的结果.
 * @param orm 已解锁数据库的查询入口.
 * @returns 上次结果, 从没备份过时为 undefined; 失败原因不是登记过的原因码时当作没有原因, 触发
 * 方式不是登记过的取值时当作手动.
 */
export function readLastResult(
  orm: VaultOrm,
): EmailBackupLastResult | undefined {
  const row = orm
    .select()
    .from(emailBackupLastResults)
    .where(eq(emailBackupLastResults.id, EMAIL_BACKUP_ROW_ID))
    .get();
  if (row === undefined) {
    return undefined;
  }
  const triggerKind = isEmailBackupTriggerKind(row.triggerKind)
    ? row.triggerKind
    : DEFAULT_EMAIL_BACKUP_TRIGGER_KIND;
  return isEmailBackupFailureReason(row.reason)
    ? {
        completedAt: row.completedAt,
        outcome: row.outcome,
        reason: row.reason,
        triggerKind,
      }
    : { completedAt: row.completedAt, outcome: row.outcome, triggerKind };
}

/**
 * 读取最近一次成功备份的时刻, 失败的备份不改变它.
 * @param orm 已解锁数据库的查询入口.
 * @returns 最近一次成功的时刻, 自 1970 年起的毫秒数; 从没成功过时为 undefined.
 */
export function readLastSuccessAt(orm: VaultOrm): number | undefined {
  const row = orm
    .select({ lastSuccessAt: emailBackupLastResults.lastSuccessAt })
    .from(emailBackupLastResults)
    .where(eq(emailBackupLastResults.id, EMAIL_BACKUP_ROW_ID))
    .get();
  return row?.lastSuccessAt ?? undefined;
}

/**
 * 保存上次备份的结果, 已有就覆盖. 成功时同时更新最近一次成功的时刻, 失败时保留原来的.
 * @param orm 已解锁数据库的查询入口.
 * @param result 要保存的结果.
 */
export function writeLastResult(
  orm: VaultOrm,
  result: EmailBackupLastResult,
): void {
  const values = {
    completedAt: result.completedAt,
    outcome: result.outcome,
    reason: result.reason ?? null,
    triggerKind: result.triggerKind,
  };
  const isSuccess = result.outcome === "success";
  orm
    .insert(emailBackupLastResults)
    .values({
      id: EMAIL_BACKUP_ROW_ID,
      ...values,
      lastSuccessAt: isSuccess ? result.completedAt : null,
    })
    .onConflictDoUpdate({
      target: emailBackupLastResults.id,
      set: isSuccess
        ? { ...values, lastSuccessAt: result.completedAt }
        : values,
    })
    .run();
}
