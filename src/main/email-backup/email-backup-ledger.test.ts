import { describe, expect, it } from "vitest";

import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultDatabase } from "../vault/database/open-vault-database";
import { DEFAULT_AUTO_BACKUP_SCHEDULE } from "./auto-backup-schedule";
import { readSchedule, writeSchedule } from "./auto-backup-schedule-repository";
import {
  readLastResult,
  readLastSuccessAt,
} from "./email-backup-last-result-repository";
import { EmailBackupLedger } from "./email-backup-ledger";

/**
 * 测试里账本使用的当前时刻.
 */
const NOW = 5000;

/**
 * 在测试数据库上创建账本.
 * @param getDatabase 取当前测试数据库的函数.
 * @returns 账本.
 */
function createLedger(getDatabase: () => VaultDatabase): EmailBackupLedger {
  return new EmailBackupLedger({
    database: { getOrm: () => getDatabase().orm, onFailure: () => undefined },
    now: () => new Date(NOW),
  });
}

describe("邮箱备份账本: 失败", () => {
  const getDatabase = useVaultDatabase("email-ledger-failure");

  it("备份根本没有开始的失败不记账", () => {
    const ledger = createLedger(getDatabase);
    for (const reason of [
      "vault-locked",
      "no-entries",
      "too-many-entries",
    ] as const) {
      ledger.recordFailure("scheduled", reason);
    }
    expect(readLastResult(getDatabase().orm)).toBeUndefined();
    expect(readSchedule(getDatabase().orm)).toBeUndefined();
  });

  it("定时失败记上次结果与退避状态, 手动失败只记上次结果", () => {
    const { orm } = getDatabase();
    writeSchedule(orm, { ...DEFAULT_AUTO_BACKUP_SCHEDULE, isEnabled: true });
    const ledger = createLedger(getDatabase);
    ledger.recordFailure("manual", "send-failed");
    expect(readSchedule(orm)?.failureCount).toBe(0);
    ledger.recordFailure("scheduled", "send-failed");
    expect(readSchedule(orm)).toMatchObject({
      failureCount: 1,
      lastFailureReason: "send-failed",
      lastFailureAt: NOW,
    });
    expect(readLastResult(orm)).toEqual({
      completedAt: NOW,
      outcome: "failure",
      reason: "send-failed",
      triggerKind: "scheduled",
    });
  });
});

describe("邮箱备份账本: 成功", () => {
  const getDatabase = useVaultDatabase("email-ledger-success");

  it("记上次结果与上次成功时间, 不为没用过自动备份的用户新建计划", () => {
    const { orm } = getDatabase();
    createLedger(getDatabase).recordSuccess("manual", NOW);
    expect(readLastSuccessAt(orm)).toBe(NOW);
    expect(readSchedule(orm)).toBeUndefined();
  });

  it("清掉已有计划的失败状态", () => {
    const { orm } = getDatabase();
    writeSchedule(orm, {
      ...DEFAULT_AUTO_BACKUP_SCHEDULE,
      isEnabled: true,
      failureCount: 2,
      isPaused: true,
    });
    createLedger(getDatabase).recordSuccess("catch-up", NOW + 1);
    expect(readSchedule(orm)).toMatchObject({
      failureCount: 0,
      isPaused: false,
    });
    expect(readLastResult(orm)).toMatchObject({ triggerKind: "catch-up" });
  });
});
