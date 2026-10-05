import { describe, expect, it } from "vitest";

import { EXPORT_SECRET_MAX_LENGTH } from "@shared/export/export-limits";

import {
  requireEmailBackupRunRequest,
  requireEmailBackupSettingsInput,
} from "./email-backup-input-guard";

/**
 * 一份合规的保存设置请求.
 */
const VALID = {
  provider: "qq",
  host: "",
  port: 465,
  security: "ssl",
  senderAddress: "alice@qq.com",
  recipientAddress: "",
  sizeLimitMebibytes: 50,
  isEncrypted: true,
  hasAcknowledgedPlaintextRisk: false,
};

/**
 * 断言一批保存设置请求都被拒绝.
 * @param values 待校验的值.
 */
function expectSettingsRejected(values: readonly unknown[]): void {
  for (const bad of values) {
    expect(() => requireEmailBackupSettingsInput(bad)).toThrow(
      "无效的邮箱备份参数",
    );
  }
}

describe("保存邮箱设置请求的进程边界校验: 合规的请求", () => {
  it("合规请求原样通过, 多余的键被丢弃", () => {
    const result = requireEmailBackupSettingsInput({ ...VALID, extra: "x" });
    expect(result).toEqual(VALID);
    expect(result).not.toHaveProperty("extra");
  });

  it("授权码, 口令与主密码有就带上, 没给就没有这三个键", () => {
    const withSecrets = requireEmailBackupSettingsInput({
      ...VALID,
      authorizationCode: "code",
      passphrase: "phrase",
      masterPassword: "master",
    });
    expect(withSecrets).toMatchObject({
      authorizationCode: "code",
      passphrase: "phrase",
      masterPassword: "master",
    });
    expect(Object.keys(requireEmailBackupSettingsInput(VALID)).sort()).toEqual(
      Object.keys(VALID).sort(),
    );
  });

  it("取值是否合理留给设置服务判断, 边界只管类型与长度", () => {
    expect(() =>
      requireEmailBackupSettingsInput({ ...VALID, sizeLimitMebibytes: -5 }),
    ).not.toThrow();
  });
});

describe("保存邮箱设置请求的进程边界校验: 不合规的请求", () => {
  it("不是对象, 邮箱类型未知, 字段类型不对时抛错", () => {
    expectSettingsRejected([
      undefined,
      null,
      "qq",
      {},
      { ...VALID, provider: "yahoo" },
      { ...VALID, security: "none" },
      { ...VALID, port: "465" },
      { ...VALID, sizeLimitMebibytes: "50" },
      { ...VALID, isEncrypted: "yes" },
      { ...VALID, hasAcknowledgedPlaintextRisk: 1 },
      { ...VALID, host: 1 },
      { ...VALID, senderAddress: null },
    ]);
  });

  it("文本字段与机密超过长度上限时抛错", () => {
    const tooLong = "a".repeat(EXPORT_SECRET_MAX_LENGTH + 1);
    expectSettingsRejected([
      { ...VALID, host: "a".repeat(254) },
      { ...VALID, senderAddress: "a".repeat(255) },
      { ...VALID, recipientAddress: "a".repeat(255) },
      { ...VALID, authorizationCode: tooLong },
      { ...VALID, passphrase: tooLong },
      { ...VALID, masterPassword: tooLong },
      { ...VALID, passphrase: 1 },
    ]);
  });
});

describe("立即备份请求的进程边界校验", () => {
  it("合规请求通过, 多余的键被丢弃, 主密码没给就没有这个键", () => {
    expect(
      requireEmailBackupRunRequest({ withoutAttachments: false, extra: 1 }),
    ).toEqual({ withoutAttachments: false });
    expect(
      requireEmailBackupRunRequest({
        withoutAttachments: true,
        masterPassword: "master",
      }),
    ).toEqual({ withoutAttachments: true, masterPassword: "master" });
  });

  it("不是对象, 标志不是布尔值, 主密码类型不对或过长时抛错", () => {
    const tooLong = "a".repeat(EXPORT_SECRET_MAX_LENGTH + 1);
    for (const bad of [
      undefined,
      null,
      {},
      { withoutAttachments: "no" },
      { withoutAttachments: false, masterPassword: 1 },
      { withoutAttachments: false, masterPassword: tooLong },
    ]) {
      expect(() => requireEmailBackupRunRequest(bad)).toThrow(
        "无效的邮箱备份参数",
      );
    }
  });
});
