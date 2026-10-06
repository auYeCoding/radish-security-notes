import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";
import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

import type { AutoBackupSchedule } from "./auto-backup-schedule";

/**
 * 同一个失败窗口里最多尝试的次数, 达到后本窗口不再尝试.
 */
export const AUTO_BACKUP_MAX_FAILED_ATTEMPTS = 3;

/**
 * 一次失败之后到下一次尝试之间至少等待的毫秒数.
 */
export const AUTO_BACKUP_RETRY_WAIT_MILLISECONDS = 60 * 60 * 1000;

/**
 * 认证失败: 重试只会再被拒绝, 暂停自动备份直到重新保存授权码.
 */
const PAUSING_FAILURES: readonly EmailBackupFailureReason[] = [
  "authentication-failed",
];

/**
 * 邮件超限: 重试结果不会变, 也不自动去掉附件, 本窗口不再尝试, 留给用户在对话框里手动处理.
 */
const GIVING_UP_FAILURES: readonly EmailBackupFailureReason[] = [
  "too-large",
  "server-rejected-size",
];

/**
 * 没有任何失败记录的退避状态.
 */
const CLEAN_FAILURE_STATE = {
  lastAttemptAt: undefined,
  failureCount: 0,
  firstFailureAt: undefined,
  isPaused: false,
  lastFailureReason: undefined,
  lastFailureAt: undefined,
} as const;

/**
 * 找出当前失败窗口的起点. 窗口从第一次失败开始, 一个间隔后结束; 起点晚于现在 (时钟被往回拨) 时
 * 窗口作废.
 * @param schedule 自动备份计划.
 * @param now 当前时刻.
 * @returns 窗口仍有效时为第一次失败的时刻, 否则为 undefined.
 */
export function findFailureWindowStart(
  schedule: AutoBackupSchedule,
  now: number,
): number | undefined {
  const { firstFailureAt, failureCount, interval } = schedule;
  if (failureCount === 0 || firstFailureAt === undefined) {
    return undefined;
  }
  const windowMilliseconds = AUTO_BACKUP_INTERVAL_MILLISECONDS[interval];
  const isActive =
    firstFailureAt <= now && now < firstFailureAt + windowMilliseconds;
  return isActive ? firstFailureAt : undefined;
}

/**
 * 记下一次自动备份的失败: 窗口过期就从新窗口重新数; 认证失败暂停; 超限直接记满次数; 其它失败
 * 次数加一.
 * @param schedule 自动备份计划.
 * @param reason 失败原因.
 * @param now 失败的时刻.
 * @returns 更新后的计划.
 */
export function afterScheduledFailure(
  schedule: AutoBackupSchedule,
  reason: EmailBackupFailureReason,
  now: number,
): AutoBackupSchedule {
  const windowStart = findFailureWindowStart(schedule, now);
  const previousCount = windowStart === undefined ? 0 : schedule.failureCount;
  return {
    ...schedule,
    lastAttemptAt: now,
    failureCount: GIVING_UP_FAILURES.includes(reason)
      ? AUTO_BACKUP_MAX_FAILED_ATTEMPTS
      : previousCount + 1,
    firstFailureAt: windowStart ?? now,
    isPaused: schedule.isPaused || PAUSING_FAILURES.includes(reason),
    lastFailureReason: reason,
    lastFailureAt: now,
  };
}

/**
 * 备份成功之后清掉失败状态: 失败次数, 暂停, 最近一次失败都清零.
 * @param schedule 自动备份计划.
 * @returns 更新后的计划.
 */
export function afterSuccess(schedule: AutoBackupSchedule): AutoBackupSchedule {
  return { ...schedule, ...CLEAN_FAILURE_STATE };
}

/**
 * 重新保存授权码之后恢复自动备份: 只对因认证失败而暂停的计划生效, 清掉暂停与失败窗口, 保留最近
 * 一次失败的记录直到下次成功.
 * @param schedule 自动备份计划.
 * @returns 更新后的计划.
 */
export function afterAuthorizationCodeSaved(
  schedule: AutoBackupSchedule,
): AutoBackupSchedule {
  if (!schedule.isPaused) {
    return schedule;
  }
  return {
    ...schedule,
    lastAttemptAt: undefined,
    failureCount: 0,
    firstFailureAt: undefined,
    isPaused: false,
  };
}

/**
 * 应用用户在对话框里选的开关与间隔: 从关闭到开启时清掉旧的失败状态, 让新的一轮从头开始.
 * @param schedule 自动备份计划.
 * @param choice 用户选的开关与间隔.
 * @returns 更新后的计划.
 */
export function afterChoiceSaved(
  schedule: AutoBackupSchedule,
  choice: Pick<AutoBackupSchedule, "isEnabled" | "interval">,
): AutoBackupSchedule {
  const isTurningOn = choice.isEnabled && !schedule.isEnabled;
  const base = isTurningOn ? { ...schedule, ...CLEAN_FAILURE_STATE } : schedule;
  return { ...base, isEnabled: choice.isEnabled, interval: choice.interval };
}
