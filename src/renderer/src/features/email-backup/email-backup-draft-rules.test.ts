import { describe, expect, it } from "vitest";

import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";

import { FAKE_EMAIL_BACKUP_VIEW } from "@renderer/testing/fake-email-backup-bridge";

import { draftFromView, type EmailBackupDraft } from "./email-backup-draft";
import {
  canRunBackup,
  canSaveDraft,
  canSendTest,
  findDraftPassphraseProblem,
  isAuthorizationCodeRequired,
  isDraftDirty,
} from "./email-backup-draft-rules";

/**
 * 一份已保存的设置视图: QQ 邮箱, 加密, 已设置授权码与口令.
 */
const SAVED: EmailBackupSettingsView = {
  ...FAKE_EMAIL_BACKUP_VIEW,
  senderAddress: "alice@qq.com",
  isSaved: true,
  hasAuthorizationCode: true,
  hasPassphrase: true,
};

/**
 * 没有任何修改的填写内容.
 */
const CLEAN: EmailBackupDraft = draftFromView(SAVED);

describe("邮箱备份填写内容: 是否有未保存的修改", () => {
  it("没有改动时没有未保存的修改", () => {
    expect(isDraftDirty(CLEAN, SAVED)).toBe(false);
  });

  it("设置字段变了, 或填了新的授权码与口令都算修改, 主密码不算", () => {
    expect(isDraftDirty({ ...CLEAN, sizeLimitMebibytes: "20" }, SAVED)).toBe(
      true,
    );
    expect(isDraftDirty({ ...CLEAN, authorizationCode: "x" }, SAVED)).toBe(
      true,
    );
    expect(isDraftDirty({ ...CLEAN, passphrase: "x" }, SAVED)).toBe(true);
    expect(isDraftDirty({ ...CLEAN, masterPassword: "x" }, SAVED)).toBe(false);
  });
});

describe("邮箱备份填写内容: 授权码与口令的要求", () => {
  it("没保存过授权码, 或连接目标变了必须重填授权码", () => {
    expect(isAuthorizationCodeRequired(CLEAN, SAVED)).toBe(false);
    expect(
      isAuthorizationCodeRequired(CLEAN, {
        ...SAVED,
        hasAuthorizationCode: false,
      }),
    ).toBe(true);
    expect(
      isAuthorizationCodeRequired({ ...CLEAN, provider: "gmail" }, SAVED),
    ).toBe(true);
    expect(
      isAuthorizationCodeRequired(
        { ...CLEAN, recipientAddress: "b@x.com" },
        SAVED,
      ),
    ).toBe(false);
  });

  it("已保存过口令且两个框都空时保持不变, 否则按口令规则", () => {
    expect(findDraftPassphraseProblem(CLEAN, SAVED)).toBeUndefined();
    expect(
      findDraftPassphraseProblem(CLEAN, { ...SAVED, hasPassphrase: false }),
    ).toBe("too-short");
    expect(
      findDraftPassphraseProblem({ ...CLEAN, passphrase: "short" }, SAVED),
    ).toBe("too-short");
    expect(
      findDraftPassphraseProblem({ ...CLEAN, isEncrypted: false }, SAVED),
    ).toBeUndefined();
  });
});

describe("邮箱备份填写内容: 保存按钮", () => {
  it("没有修改时不能保存, 改了合规的设置后可以保存", () => {
    expect(canSaveDraft(CLEAN, SAVED)).toBe(false);
    expect(canSaveDraft({ ...CLEAN, sizeLimitMebibytes: "20" }, SAVED)).toBe(
      true,
    );
  });

  it("字段不合规, 不支持的邮箱, 缺必填的授权码或主密码时不能保存", () => {
    const changed = { ...CLEAN, sizeLimitMebibytes: "20" };
    expect(canSaveDraft({ ...changed, sizeLimitMebibytes: "0" }, SAVED)).toBe(
      false,
    );
    expect(canSaveDraft({ ...changed, provider: "outlook" }, SAVED)).toBe(
      false,
    );
    expect(canSaveDraft({ ...changed, provider: "gmail" }, SAVED)).toBe(false);
    expect(
      canSaveDraft(changed, { ...SAVED, requiresMasterPassword: true }),
    ).toBe(false);
  });

  it("不加密时必须勾选明文风险确认", () => {
    const plain = { ...CLEAN, isEncrypted: false };
    expect(canSaveDraft(plain, SAVED)).toBe(false);
    expect(
      canSaveDraft({ ...plain, hasAcknowledgedPlaintextRisk: true }, SAVED),
    ).toBe(true);
  });

  it("从没保存过时填好必填项就能保存", () => {
    const first = {
      ...draftFromView(FAKE_EMAIL_BACKUP_VIEW),
      senderAddress: "a@qq.com",
      authorizationCode: "code",
      passphrase: "a long enough passphrase",
      passphraseConfirmation: "a long enough passphrase",
    };
    expect(canSaveDraft(first, FAKE_EMAIL_BACKUP_VIEW)).toBe(true);
  });
});

describe("邮箱备份填写内容: 测试邮件与立即备份按钮", () => {
  it("保存过且没有未保存的修改时可以发送测试邮件", () => {
    expect(canSendTest(CLEAN, SAVED)).toBe(true);
    expect(canSendTest({ ...CLEAN, sizeLimitMebibytes: "20" }, SAVED)).toBe(
      false,
    );
    expect(
      canSendTest(
        draftFromView(FAKE_EMAIL_BACKUP_VIEW),
        FAKE_EMAIL_BACKUP_VIEW,
      ),
    ).toBe(false);
    expect(canSendTest(CLEAN, { ...SAVED, provider: "outlook" })).toBe(false);
  });

  it("设了主密码时立即备份还要已输入主密码", () => {
    const protectedView = { ...SAVED, requiresMasterPassword: true };
    expect(canRunBackup(CLEAN, SAVED)).toBe(true);
    expect(canRunBackup(CLEAN, protectedView)).toBe(false);
    expect(canRunBackup({ ...CLEAN, masterPassword: "m" }, protectedView)).toBe(
      true,
    );
  });
});
