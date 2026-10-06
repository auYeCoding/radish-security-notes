import {
  emailBackupSucceeded,
  type EmailBackupFailureReason,
} from "@shared/email-backup/email-backup-result";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { evaluateAutoBackup, type AutoBackupDecision } from "./auto-backup-due";
import { DEFAULT_AUTO_BACKUP_SCHEDULE } from "./auto-backup-schedule";
import { readSchedule } from "./auto-backup-schedule-repository";
import { readLastSuccessAt } from "./email-backup-last-result-repository";

/**
 * 读出已保存的计划与最近一次成功的时刻, 判断现在要不要自动备份.
 * @param orm 已解锁数据库的查询入口.
 * @param now 当前时刻.
 * @returns 判断结果.
 */
export function readAutoBackupDecision(
  orm: VaultOrm,
  now: Date,
): AutoBackupDecision {
  return evaluateAutoBackup(
    now.getTime(),
    readSchedule(orm) ?? DEFAULT_AUTO_BACKUP_SCHEDULE,
    readLastSuccessAt(orm),
  );
}

/**
 * 判断现在是否该自动备份: 数据库已解锁, 已开启, 没暂停, 距上次成功满一个间隔, 且过了失败退避.
 * 数据库没解锁或读取出错时当作不该备份.
 * @param access 取数据库与报告失败的依赖.
 * @param now 当前时刻.
 * @returns 该自动备份时为 true.
 */
export function isAutoBackupDue(access: DatabaseAccess, now: Date): boolean {
  const decision = runWithDatabase<
    AutoBackupDecision,
    EmailBackupFailureReason
  >(access, (orm) => emailBackupSucceeded(readAutoBackupDecision(orm, now)));
  return decision.ok && decision.value.phase === "due";
}
