import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

import type { AutoBackupDecision } from "./auto-backup-due";
import type { AutoBackupSchedule } from "./auto-backup-schedule";

/**
 * 由计划, 判断结果与开启受阻的原因得出交给渲染端的自动备份状态. 失败原因与时刻总是成对出现.
 * @param schedule 自动备份计划.
 * @param decision 对现在要不要备份的判断.
 * @param blocker 现在还不能开启自动备份的原因, 能开启时为 undefined.
 * @returns 自动备份状态.
 */
export function toAutoBackupStatus(
  schedule: AutoBackupSchedule,
  decision: AutoBackupDecision,
  blocker: EmailBackupFailureReason | undefined,
): AutoBackupStatus {
  const { lastFailureReason, lastFailureAt } = schedule;
  const hasLastFailure =
    lastFailureReason !== undefined && lastFailureAt !== undefined;
  return {
    isEnabled: schedule.isEnabled,
    interval: schedule.interval,
    phase: decision.phase,
    ...(decision.nextRunAt === undefined
      ? {}
      : { nextRunAt: decision.nextRunAt }),
    ...(blocker === undefined ? {} : { blocker }),
    ...(hasLastFailure ? { lastFailureReason, lastFailureAt } : {}),
  };
}
