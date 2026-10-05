import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  type EmailBackupSettings,
} from "./email-backup-settings";
import {
  hasConnectionTargetChanged,
  resolveSmtpConnection,
} from "./smtp-connection";

/**
 * 一份已保存的设置: QQ 邮箱.
 */
const SAVED: EmailBackupSettings = {
  ...DEFAULT_EMAIL_BACKUP_SETTINGS,
  senderAddress: "alice@qq.com",
};

describe("解析实际连接的服务器", () => {
  it("预置类型取预置表, 不信任设置里存的服务器", () => {
    const resolved = resolveSmtpConnection({
      ...SAVED,
      provider: "gmail",
      host: "evil.example",
      port: 25,
      security: "starttls",
    });
    expect(resolved).toEqual({
      host: "smtp.gmail.com",
      port: 465,
      security: "ssl",
    });
  });

  it("自定义类型取用户填写的服务器", () => {
    const resolved = resolveSmtpConnection({
      ...SAVED,
      provider: "custom",
      host: "mail.example.com",
      port: 587,
      security: "starttls",
    });
    expect(resolved).toEqual({
      host: "mail.example.com",
      port: 587,
      security: "starttls",
    });
  });
});

describe("连接目标是否变了", () => {
  it("邮箱类型, 发件地址, 自定义的服务器, 端口, 连接方式任一项变了就是变了", () => {
    const custom = {
      ...SAVED,
      provider: "custom" as const,
      host: "mail.example.com",
    };
    expect(
      hasConnectionTargetChanged({ ...SAVED, provider: "gmail" }, SAVED),
    ).toBe(true);
    expect(
      hasConnectionTargetChanged(
        { ...SAVED, senderAddress: "b@qq.com" },
        SAVED,
      ),
    ).toBe(true);
    expect(
      hasConnectionTargetChanged(
        { ...custom, host: "other.example.com" },
        custom,
      ),
    ).toBe(true);
    expect(hasConnectionTargetChanged({ ...custom, port: 587 }, custom)).toBe(
      true,
    );
    expect(
      hasConnectionTargetChanged({ ...custom, security: "starttls" }, custom),
    ).toBe(true);
  });

  it("只改收件邮箱, 上限, 加密选项, 或预置类型存储里无意义的服务器字段不算变", () => {
    expect(
      hasConnectionTargetChanged(
        {
          ...SAVED,
          recipientAddress: "bob@x.com",
          sizeLimitMebibytes: 5,
          isEncrypted: false,
          host: "ignored.example",
          port: 25,
        },
        SAVED,
      ),
    ).toBe(false);
  });
});
