import { describe, expect, it } from "vitest";

import { DEFAULT_EMAIL_BACKUP_SETTINGS } from "@shared/email-backup/email-backup-settings";

import { findBackupReadinessProblem } from "./email-backup-readiness";
import type { EmailBackupStoredState } from "./email-backup-stored-state";

/**
 * 一份能备份的状态: 保存过设置, 有授权码与口令, 备份加密.
 */
const READY_STATE: EmailBackupStoredState = {
  isSaved: true,
  settings: { ...DEFAULT_EMAIL_BACKUP_SETTINGS, senderAddress: "a@qq.com" },
  credentials: { authorizationCode: "code", passphrase: "phrase" },
};

describe("备份就绪检查", () => {
  it("设置, 授权码与口令都齐全时没有问题", () => {
    expect(findBackupReadinessProblem(READY_STATE)).toBeUndefined();
  });

  it("没保存过设置或没有授权码返回 not-configured", () => {
    expect(findBackupReadinessProblem({ ...READY_STATE, isSaved: false })).toBe(
      "not-configured",
    );
    expect(
      findBackupReadinessProblem({
        ...READY_STATE,
        credentials: { authorizationCode: undefined, passphrase: "phrase" },
      }),
    ).toBe("not-configured");
  });

  it("邮箱类型不受支持返回 unsupported-provider", () => {
    expect(
      findBackupReadinessProblem({
        ...READY_STATE,
        settings: { ...READY_STATE.settings, provider: "outlook" },
      }),
    ).toBe("unsupported-provider");
  });

  it("加密却没有口令返回 passphrase-missing", () => {
    expect(
      findBackupReadinessProblem({
        ...READY_STATE,
        credentials: { authorizationCode: "code", passphrase: undefined },
      }),
    ).toBe("passphrase-missing");
  });

  it("不加密时必须已确认明文风险", () => {
    const plain = { ...READY_STATE.settings, isEncrypted: false };
    expect(
      findBackupReadinessProblem({ ...READY_STATE, settings: plain }),
    ).toBe("plaintext-not-acknowledged");
    expect(
      findBackupReadinessProblem({
        ...READY_STATE,
        settings: { ...plain, hasAcknowledgedPlaintextRisk: true },
      }),
    ).toBeUndefined();
  });
});
