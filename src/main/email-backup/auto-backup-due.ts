import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";
import type { AutoBackupPhase } from "@shared/email-backup/auto-backup-status";

import {
  AUTO_BACKUP_MAX_FAILED_ATTEMPTS,
  AUTO_BACKUP_RETRY_WAIT_MILLISECONDS,
  findFailureWindowStart,
} from "./auto-backup-backoff";
import type { AutoBackupSchedule } from "./auto-backup-schedule";

/**
 * 对 "现在要不要自动备份" 的判断.
 */
export interface AutoBackupDecision {
  /**
   * 判断得出的阶段, `due` 表示现在就该备份, 其它阶段都是不备份.
   */
  readonly phase: AutoBackupPhase;
  /**
   * 下次计划尝试的时刻, 自 1970 年起的毫秒数; 关闭, 暂停, 现在就该备份时没有这一项.
   */
  readonly nextRunAt?: number;
}

/**
 * 算出距上次成功备份满一个间隔的时刻. 没有成功记录, 或成功时刻晚于现在 (时钟被往回拨) 时当作没有
 * 有效的成功记录.
 * @param now 当前时刻.
 * @param lastSuccessAt 最近一次成功备份的时刻.
 * @param intervalMilliseconds 间隔的毫秒数.
 * @returns 下次到点的时刻, 没有有效成功记录时为 undefined.
 */
function findSuccessDueAt(
  now: number,
  lastSuccessAt: number | undefined,
  intervalMilliseconds: number,
): number | undefined {
  if (lastSuccessAt === undefined || lastSuccessAt > now) {
    return undefined;
  }
  return lastSuccessAt + intervalMilliseconds;
}

/**
 * 已到点之后再看失败退避: 窗口内次数用完就等窗口结束, 距上次尝试不足一小时就等一小时.
 * @param now 当前时刻.
 * @param schedule 自动备份计划.
 * @returns 退避判断的结果.
 */
function evaluateRetry(
  now: number,
  schedule: AutoBackupSchedule,
): AutoBackupDecision {
  const windowStart = findFailureWindowStart(schedule, now);
  if (windowStart === undefined) {
    return { phase: "due" };
  }
  if (schedule.failureCount >= AUTO_BACKUP_MAX_FAILED_ATTEMPTS) {
    return {
      phase: "exhausted",
      nextRunAt:
        windowStart + AUTO_BACKUP_INTERVAL_MILLISECONDS[schedule.interval],
    };
  }
  const { lastAttemptAt } = schedule;
  if (lastAttemptAt === undefined || lastAttemptAt > now) {
    return { phase: "due" };
  }
  const retryAt = lastAttemptAt + AUTO_BACKUP_RETRY_WAIT_MILLISECONDS;
  return now < retryAt
    ? { phase: "backing-off", nextRunAt: retryAt }
    : { phase: "due" };
}

/**
 * 判断现在要不要自动备份: 关闭或暂停不备份; 距上次成功备份 (手动或自动都算) 没满一个间隔就等;
 * 满了或没有成功记录就备份, 但要先过失败退避.
 * @param now 当前时刻.
 * @param schedule 自动备份计划.
 * @param lastSuccessAt 最近一次成功备份的时刻, 从没成功过时为 undefined.
 * @returns 判断结果.
 */
export function evaluateAutoBackup(
  now: number,
  schedule: AutoBackupSchedule,
  lastSuccessAt: number | undefined,
): AutoBackupDecision {
  if (!schedule.isEnabled) {
    return { phase: "off" };
  }
  if (schedule.isPaused) {
    return { phase: "paused" };
  }
  const successDueAt = findSuccessDueAt(
    now,
    lastSuccessAt,
    AUTO_BACKUP_INTERVAL_MILLISECONDS[schedule.interval],
  );
  if (successDueAt !== undefined && now < successDueAt) {
    return { phase: "scheduled", nextRunAt: successDueAt };
  }
  return evaluateRetry(now, schedule);
}
