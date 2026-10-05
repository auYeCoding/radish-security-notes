import { eq } from "drizzle-orm";

import {
  isEmailBackupFailureReason,
  type EmailBackupLastResult,
} from "@shared/email-backup/email-backup-result";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupLastResults } from "../vault/database/email-backup-last-result-schema";
import { EMAIL_BACKUP_ROW_ID } from "./email-backup-row-id";

/**
 * 读取上次备份的结果.
 * @param orm 已解锁数据库的查询入口.
 * @returns 上次结果, 从没备份过时为 undefined; 失败原因不是登记过的原因码时当作没有原因.
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
  return isEmailBackupFailureReason(row.reason)
    ? { completedAt: row.completedAt, outcome: row.outcome, reason: row.reason }
    : { completedAt: row.completedAt, outcome: row.outcome };
}

/**
 * 保存上次备份的结果, 已有就覆盖.
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
  };
  orm
    .insert(emailBackupLastResults)
    .values({ id: EMAIL_BACKUP_ROW_ID, ...values })
    .onConflictDoUpdate({ target: emailBackupLastResults.id, set: values })
    .run();
}
