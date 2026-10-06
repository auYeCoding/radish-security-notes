import type { TFunction } from "i18next";

import type {
  AutoBackupPhase,
  AutoBackupStatus,
} from "@shared/email-backup/auto-backup-status";

import { formatBackupTime } from "./format-backup-time";

/**
 * 每个阶段对应的文案键.
 */
const PHASE_MESSAGE_KEYS = {
  off: "emailBackup.auto.phase.off",
  scheduled: "emailBackup.auto.phase.scheduled",
  due: "emailBackup.auto.phase.due",
  "backing-off": "emailBackup.auto.phase.backingOff",
  exhausted: "emailBackup.auto.phase.exhausted",
  paused: "emailBackup.auto.phase.paused",
} as const satisfies Record<AutoBackupPhase, string>;

/**
 * 把自动备份当前的阶段写成给用户看的一句话, 带时刻的阶段写出界面语言的日期与时间.
 * @param status 自动备份的状态.
 * @param translate 翻译函数.
 * @param language 当前界面语言.
 * @returns 一句话.
 */
export function describeAutoBackupPhase(
  status: AutoBackupStatus,
  translate: TFunction,
  language: string,
): string {
  const time =
    status.nextRunAt === undefined
      ? ""
      : formatBackupTime(status.nextRunAt, language);
  return translate(PHASE_MESSAGE_KEYS[status.phase], { time });
}
