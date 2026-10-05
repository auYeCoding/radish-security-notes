/**
 * 主进程生成邮件时用到的文案键: 备份邮件与测试邮件的主题与正文, 以及正文里 "是否加密", "是否含
 * 附件" 的取值. 键对应的文案写在 `shared/locales` 里, 键类型在编译期与 `zh.json` 对照.
 */
export type EmailBackupMessageKey =
  | "emailBackup.mail.backup.subject"
  | "emailBackup.mail.backup.body"
  | "emailBackup.mail.test.subject"
  | "emailBackup.mail.test.body"
  | "emailBackup.mail.value.encrypted"
  | "emailBackup.mail.value.plain"
  | "emailBackup.mail.value.withAttachments"
  | "emailBackup.mail.value.withoutAttachments";

/**
 * 主进程取邮件文案的函数, 参数填进文案里的占位符.
 */
export type EmailBackupTranslate = (
  key: EmailBackupMessageKey,
  parameters?: Readonly<Record<string, string | number>>,
) => string;
