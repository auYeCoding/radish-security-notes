import { vi } from "vitest";

import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";
import {
  emailBackupFailed,
  emailBackupSucceeded,
} from "@shared/email-backup/email-backup-result";

import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  savedEmailBackupOverrides,
} from "./fake-email-backup-bridge";

/**
 * 最近一次自动备份失败的状态: 连接失败, 已进入退避等待.
 */
export const FAILED_AUTO_BACKUP_STATUS: AutoBackupStatus = {
  isEnabled: true,
  interval: "daily",
  phase: "backing-off",
  lastFailureReason: "connection-failed",
  lastFailureAt: new Date(2026, 9, 5, 21, 0).getTime(),
};

/**
 * 让假邮箱备份桥读取自动备份状态时依次返回给定的结果, 读取设置时返回已保存过的设置.
 * @param results 每次读取自动备份状态的结果, 用完后重复最后一个; undefined 表示读取失败, 例如保险库未解锁.
 * @returns 可交给条目测试环境的邮箱备份桥覆盖项.
 */
export function autoBackupStatusOverrides(
  results: readonly (AutoBackupStatus | undefined)[],
): Partial<EmailBackupBridge> {
  let index = 0;
  return savedEmailBackupOverrides(FAKE_SAVED_EMAIL_BACKUP_VIEW, {
    getAutoBackup: vi.fn(() => {
      const status = results[Math.min(index, results.length - 1)];
      index += 1;
      return Promise.resolve(
        status === undefined
          ? emailBackupFailed("vault-locked")
          : emailBackupSucceeded(status),
      );
    }),
  });
}
