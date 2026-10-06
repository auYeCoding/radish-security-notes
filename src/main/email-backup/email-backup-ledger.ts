import {
  emailBackupSucceeded,
  type EmailBackupFailureReason,
} from "@shared/email-backup/email-backup-result";
import type { EmailBackupTriggerKind } from "@shared/email-backup/email-backup-trigger-kind";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import { afterScheduledFailure, afterSuccess } from "./auto-backup-backoff";
import { DEFAULT_AUTO_BACKUP_SCHEDULE } from "./auto-backup-schedule";
import {
  readSchedule,
  updateExistingSchedule,
  writeSchedule,
} from "./auto-backup-schedule-repository";
import { writeLastResult } from "./email-backup-last-result-repository";

/**
 * 不记进账本的失败: 备份根本没有开始, 或没有可备份的数据.
 */
const UNRECORDED_FAILURES: readonly EmailBackupFailureReason[] = [
  "vault-locked",
  "no-entries",
  "too-many-entries",
];

/**
 * 邮箱备份账本需要的依赖.
 */
export interface EmailBackupLedgerDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 取当前时刻.
   */
  readonly now: () => Date;
}

/**
 * 邮箱备份账本: 一次备份尝试结束后, 在一个事务里记下上次结果与自动备份的退避状态. 手动备份的
 * 失败只记上次结果, 不影响自动备份的计划; 任何成功都会清掉自动备份的失败状态. 写不进去时只通知
 * 失败回调, 不影响备份本身的结果.
 */
export class EmailBackupLedger {
  /**
   * 创建账本.
   * @param dependencies 账本依赖.
   */
  constructor(private readonly dependencies: EmailBackupLedgerDependencies) {}

  /**
   * 记一次成功的备份.
   * @param triggerKind 触发方式.
   * @param completedAt 备份完成的时刻, 自 1970 年起的毫秒数.
   */
  recordSuccess(
    triggerKind: EmailBackupTriggerKind,
    completedAt: number,
  ): void {
    runWithDatabase<undefined, EmailBackupFailureReason>(
      this.dependencies.database,
      (orm) => {
        orm.transaction((transaction) => {
          writeLastResult(transaction, {
            completedAt,
            outcome: "success",
            triggerKind,
          });
          updateExistingSchedule(transaction, afterSuccess);
        });
        return emailBackupSucceeded(undefined);
      },
    );
  }

  /**
   * 记一次失败的备份, 备份根本没有开始的失败不记.
   * @param triggerKind 触发方式.
   * @param reason 失败原因.
   */
  recordFailure(
    triggerKind: EmailBackupTriggerKind,
    reason: EmailBackupFailureReason,
  ): void {
    if (UNRECORDED_FAILURES.includes(reason)) {
      return;
    }
    const completedAt = this.dependencies.now().getTime();
    runWithDatabase<undefined, EmailBackupFailureReason>(
      this.dependencies.database,
      (orm) => {
        orm.transaction((transaction) => {
          writeLastResult(transaction, {
            completedAt,
            outcome: "failure",
            reason,
            triggerKind,
          });
          if (triggerKind !== "manual") {
            writeSchedule(
              transaction,
              afterScheduledFailure(
                readSchedule(transaction) ?? DEFAULT_AUTO_BACKUP_SCHEDULE,
                reason,
                completedAt,
              ),
            );
          }
        });
        return emailBackupSucceeded(undefined);
      },
    );
  }
}
