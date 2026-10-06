import { describe, expect, it } from "vitest";

import { DEFAULT_AUTO_BACKUP_STATUS } from "@shared/email-backup/auto-backup-status";

import {
  FAKE_SAVED_EMAIL_BACKUP_VIEW,
  FAKE_EMAIL_BACKUP_VIEW,
} from "@renderer/testing/fake-email-backup-bridge";

import {
  canChangeAutoBackupInterval,
  canTurnOnAutoBackup,
  isMasterPasswordMissing,
} from "./auto-backup-rules";
import { draftFromView } from "./email-backup-draft";

/**
 * 设了主密码的已保存设置.
 */
const PROTECTED_VIEW = {
  ...FAKE_SAVED_EMAIL_BACKUP_VIEW,
  requiresMasterPassword: true,
};

describe("自动备份的主密码要求", () => {
  it("只有保险库设了主密码且还没填时才缺主密码", () => {
    const draft = draftFromView(PROTECTED_VIEW);
    expect(isMasterPasswordMissing(draft, PROTECTED_VIEW)).toBe(true);
    expect(
      isMasterPasswordMissing(
        { ...draft, masterPassword: "m" },
        PROTECTED_VIEW,
      ),
    ).toBe(false);
    expect(
      isMasterPasswordMissing(
        draftFromView(FAKE_SAVED_EMAIL_BACKUP_VIEW),
        FAKE_SAVED_EMAIL_BACKUP_VIEW,
      ),
    ).toBe(false);
  });
});

describe("自动备份能不能打开", () => {
  const draft = draftFromView(FAKE_SAVED_EMAIL_BACKUP_VIEW);

  it("没有受阻原因, 没有未保存的修改, 不缺主密码时能打开", () => {
    expect(
      canTurnOnAutoBackup(
        DEFAULT_AUTO_BACKUP_STATUS,
        draft,
        FAKE_SAVED_EMAIL_BACKUP_VIEW,
      ),
    ).toBe(true);
  });

  it("有受阻原因, 有未保存的修改或缺主密码时不能打开", () => {
    const blocked = {
      ...DEFAULT_AUTO_BACKUP_STATUS,
      blocker: "not-configured" as const,
    };
    expect(
      canTurnOnAutoBackup(blocked, draft, FAKE_SAVED_EMAIL_BACKUP_VIEW),
    ).toBe(false);
    expect(
      canTurnOnAutoBackup(
        DEFAULT_AUTO_BACKUP_STATUS,
        { ...draft, recipientAddress: "b@example.com" },
        FAKE_SAVED_EMAIL_BACKUP_VIEW,
      ),
    ).toBe(false);
    expect(
      canTurnOnAutoBackup(
        DEFAULT_AUTO_BACKUP_STATUS,
        draftFromView(PROTECTED_VIEW),
        PROTECTED_VIEW,
      ),
    ).toBe(false);
  });

  it("没保存过设置时不能打开", () => {
    const blocked = {
      ...DEFAULT_AUTO_BACKUP_STATUS,
      blocker: "not-configured" as const,
    };
    expect(
      canTurnOnAutoBackup(
        blocked,
        draftFromView(FAKE_EMAIL_BACKUP_VIEW),
        FAKE_EMAIL_BACKUP_VIEW,
      ),
    ).toBe(false);
  });
});

describe("自动备份能不能改间隔", () => {
  it("关着时不需要主密码, 开着时缺主密码不能改", () => {
    const draft = draftFromView(PROTECTED_VIEW);
    const enabled = { ...DEFAULT_AUTO_BACKUP_STATUS, isEnabled: true };
    expect(
      canChangeAutoBackupInterval(
        DEFAULT_AUTO_BACKUP_STATUS,
        draft,
        PROTECTED_VIEW,
      ),
    ).toBe(true);
    expect(canChangeAutoBackupInterval(enabled, draft, PROTECTED_VIEW)).toBe(
      false,
    );
    expect(
      canChangeAutoBackupInterval(
        enabled,
        { ...draft, masterPassword: "m" },
        PROTECTED_VIEW,
      ),
    ).toBe(true);
  });
});
