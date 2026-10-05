import { describe, expect, it } from "vitest";

import {
  EMAIL_BACKUP_FAILURE_REASONS,
  emailBackupFailed,
  emailBackupSucceeded,
  isEmailBackupFailureReason,
} from "./email-backup-result";

describe("邮箱备份的失败原因", () => {
  it("包含数据库操作都可能遇到的两种原因, 原因码没有重复", () => {
    expect(EMAIL_BACKUP_FAILURE_REASONS).toContain("vault-locked");
    expect(EMAIL_BACKUP_FAILURE_REASONS).toContain("unexpected-error");
    expect(new Set(EMAIL_BACKUP_FAILURE_REASONS).size).toBe(
      EMAIL_BACKUP_FAILURE_REASONS.length,
    );
  });

  it("判断一个值是否是登记过的原因码", () => {
    expect(isEmailBackupFailureReason("too-large")).toBe(true);
    expect(isEmailBackupFailureReason("made-up")).toBe(false);
    expect(isEmailBackupFailureReason(null)).toBe(false);
  });

  it("构造成功与失败的结果", () => {
    expect(emailBackupSucceeded(1)).toEqual({ ok: true, value: 1 });
    expect(emailBackupFailed("busy")).toEqual({ ok: false, reason: "busy" });
  });
});
