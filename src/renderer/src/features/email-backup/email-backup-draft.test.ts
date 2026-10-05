import { describe, expect, it } from "vitest";

import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";

import { FAKE_EMAIL_BACKUP_VIEW } from "@renderer/testing/fake-email-backup-bridge";

import {
  applyProvider,
  draftFromView,
  settingsOfDraft,
  toSettingsInput,
} from "./email-backup-draft";

/**
 * 一份已保存的设置视图: QQ 邮箱, 加密, 已设置授权码与口令.
 */
const SAVED_VIEW: EmailBackupSettingsView = {
  ...FAKE_EMAIL_BACKUP_VIEW,
  senderAddress: "alice@qq.com",
  isSaved: true,
  hasAuthorizationCode: true,
  hasPassphrase: true,
};

describe("邮箱备份填写内容: 由设置视图得出", () => {
  it("设置字段取自视图, 数字按文本保存, 机密字段都是空的", () => {
    expect(draftFromView(SAVED_VIEW)).toEqual({
      provider: "qq",
      host: "smtp.qq.com",
      port: "465",
      security: "ssl",
      senderAddress: "alice@qq.com",
      recipientAddress: "",
      sizeLimitMebibytes: "50",
      isEncrypted: true,
      hasAcknowledgedPlaintextRisk: false,
      authorizationCode: "",
      passphrase: "",
      passphraseConfirmation: "",
      masterPassword: "",
    });
  });

  it("填写内容转成设置: 文本转数字, 地址去首尾空格", () => {
    const draft = {
      ...draftFromView(SAVED_VIEW),
      port: "587",
      sizeLimitMebibytes: "20",
      senderAddress: " alice@qq.com ",
      host: " mail.example.com ",
    };
    expect(settingsOfDraft(draft)).toMatchObject({
      port: 587,
      sizeLimitMebibytes: 20,
      senderAddress: "alice@qq.com",
      host: "mail.example.com",
    });
    expect(settingsOfDraft({ ...draft, port: "" }).port).toBe(0);
  });
});

describe("邮箱备份填写内容: 送给主进程的保存请求", () => {
  it("空的授权码, 口令与主密码不带", () => {
    const input = toSettingsInput(draftFromView(SAVED_VIEW));
    expect(input).not.toHaveProperty("authorizationCode");
    expect(input).not.toHaveProperty("passphrase");
    expect(input).not.toHaveProperty("masterPassword");
  });

  it("填了就带上, 不加密时不带口令", () => {
    const draft = {
      ...draftFromView(SAVED_VIEW),
      authorizationCode: "code",
      passphrase: "a long enough passphrase",
      masterPassword: "master",
    };
    expect(toSettingsInput(draft)).toMatchObject({
      authorizationCode: "code",
      passphrase: "a long enough passphrase",
      masterPassword: "master",
    });
    expect(
      toSettingsInput({ ...draft, isEncrypted: false }),
    ).not.toHaveProperty("passphrase");
  });
});

describe("邮箱备份填写内容: 换邮箱类型", () => {
  it("服务器, 端口, 连接方式与上限换成预置值, 其余字段保留", () => {
    const draft = { ...draftFromView(SAVED_VIEW), authorizationCode: "code" };
    expect(applyProvider(draft, "netease163")).toMatchObject({
      provider: "netease163",
      host: "smtp.163.com",
      port: "465",
      sizeLimitMebibytes: "15",
      senderAddress: "alice@qq.com",
      authorizationCode: "code",
    });
  });

  it("换成自定义类型时服务器地址留空等用户填写", () => {
    expect(applyProvider(draftFromView(SAVED_VIEW), "custom")).toMatchObject({
      provider: "custom",
      host: "",
      sizeLimitMebibytes: "10",
    });
  });
});
