import type { i18n } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";

import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";
import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import type { SupportedLanguage } from "@shared/preferences/language";

import { buildBackupMail, buildTestMail } from "./mail-message-builder";

/**
 * 测试用的收发地址.
 */
const ADDRESSES = { from: "alice@example.com", to: "bob@example.com" };

/**
 * 测试用的备份文件.
 */
const ATTACHMENT = {
  fileName: "radish-security-notes-backup-2026-10-05.zip.age",
  filePath: "/tmp/backup",
};

/**
 * 正文里写的事实: 2026-10-05 20:30 完成, 约 12.34 MB, 8 个条目, 3 个附件, 口令加密.
 */
const FACTS = {
  completedAt: new Date(2026, 9, 5, 20, 30),
  fileSizeBytes: Math.round(12.34 * 1024 * 1024),
  entryCount: 8,
  attachmentCount: 3,
  includesAttachments: true,
  isEncrypted: true,
};

/**
 * 创建某种语言的文案函数.
 * @param instance 初始化好的 i18next 实例.
 * @returns 文案函数.
 */
function translateWith(instance: i18n): EmailBackupTranslate {
  return (key, parameters) => String(instance.t(key, parameters));
}

describe.each<[SupportedLanguage, string, string]>([
  ["zh", "安全笔记备份 2026-10-05", "备份时间: 2026-10-05 20:30"],
  ["en", "Security Notes backup 2026-10-05", "Backup time: 2026-10-05 20:30"],
])("邮件模板: %s", (language, subject, timeLine) => {
  let translate: EmailBackupTranslate;
  beforeAll(async () => {
    translate = translateWith(
      await createI18nInstance({
        language,
        isPseudoLocalizationEnabled: false,
      }),
    );
  });

  it("备份邮件的主题与正文随界面语言, 占位符都被填上", () => {
    const mail = buildBackupMail(translate, ADDRESSES, FACTS, ATTACHMENT);
    expect(mail.subject).toBe(subject);
    expect(mail.text).toContain(timeLine);
    expect(mail.text).toContain("12.34 MB");
    expect(mail.text).toContain("8");
    expect(mail.text).not.toMatch(/[{}]/);
    expect(mail).toMatchObject({ ...ADDRESSES, attachment: ATTACHMENT });
  });

  it("不含附件与不加密的取值写在正文里", () => {
    const plain = buildBackupMail(
      translate,
      ADDRESSES,
      {
        ...FACTS,
        includesAttachments: false,
        attachmentCount: 0,
        isEncrypted: false,
      },
      ATTACHMENT,
    );
    const encrypted = buildBackupMail(translate, ADDRESSES, FACTS, ATTACHMENT);
    expect(plain.text).not.toBe(encrypted.text);
    expect(plain.text).not.toMatch(/[{}]/);
  });

  it("测试邮件没有附件, 正文没有占位符", () => {
    const mail = buildTestMail(translate, ADDRESSES);
    expect(mail.attachment).toBeUndefined();
    expect(mail.subject).not.toBe("");
    expect(mail.text).not.toMatch(/[{}]/);
  });
});
