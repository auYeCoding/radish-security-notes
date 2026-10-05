import { BYTES_PER_MEBIBYTE } from "@shared/email-backup/email-backup-limits";
import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";

import { formatLocalIsoDate } from "../recovery/local-iso-date";
import type { MailAttachment, OutgoingMail } from "./mail-sender-port";

/**
 * 邮件的发件与收件地址.
 */
export interface MailAddresses {
  /**
   * 发件邮箱地址.
   */
  readonly from: string;
  /**
   * 收件邮箱地址.
   */
  readonly to: string;
}

/**
 * 备份邮件正文里写的事实: 时间, 大小, 条目数, 附件与加密情况, 没有任何条目内容.
 */
export interface BackupMailFacts {
  /**
   * 备份完成的时刻.
   */
  readonly completedAt: Date;
  /**
   * 备份文件的字节数.
   */
  readonly fileSizeBytes: number;
  /**
   * 备份里的条目数.
   */
  readonly entryCount: number;
  /**
   * 备份里带的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 备份是否含附件.
   */
  readonly includesAttachments: boolean;
  /**
   * 备份是否用口令加密.
   */
  readonly isEncrypted: boolean;
}

/**
 * 小时与分钟的位数.
 */
const TIME_FIELD_WIDTH = 2;

/**
 * 邮件正文里文件大小保留的小数位数.
 */
const SIZE_FRACTION_DIGITS = 2;

/**
 * 把时刻按本地时区格式化成 `YYYY-MM-DD HH:mm`.
 * @param date 要格式化的时刻.
 * @returns 形如 `2026-10-05 20:30` 的文本.
 */
function formatLocalDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(TIME_FIELD_WIDTH, "0");
  const minutes = String(date.getMinutes()).padStart(TIME_FIELD_WIDTH, "0");
  return `${formatLocalIsoDate(date)} ${hours}:${minutes}`;
}

/**
 * 把字节数格式化成以 MB 为单位的文本.
 * @param bytes 字节数.
 * @returns 形如 `12.34 MB` 的文本.
 */
function formatMebibytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MEBIBYTE).toFixed(SIZE_FRACTION_DIGITS)} MB`;
}

/**
 * 构造备份邮件: 带备份文件作附件, 主题与正文固定模板随界面语言, 正文只写时间, 大小, 条目数, 附件
 * 与加密情况.
 * @param translate 取当前语言文案的函数.
 * @param addresses 发件与收件地址.
 * @param facts 正文里写的事实.
 * @param attachment 备份文件.
 * @returns 要发出的邮件.
 */
export function buildBackupMail(
  translate: EmailBackupTranslate,
  addresses: MailAddresses,
  facts: BackupMailFacts,
  attachment: MailAttachment,
): OutgoingMail {
  return {
    ...addresses,
    subject: translate("emailBackup.mail.backup.subject", {
      date: formatLocalIsoDate(facts.completedAt),
    }),
    text: translate("emailBackup.mail.backup.body", {
      time: formatLocalDateTime(facts.completedAt),
      size: formatMebibytes(facts.fileSizeBytes),
      entries: facts.entryCount,
      attachments: facts.includesAttachments
        ? translate("emailBackup.mail.value.withAttachments", {
            count: facts.attachmentCount,
          })
        : translate("emailBackup.mail.value.withoutAttachments"),
      encryption: translate(
        facts.isEncrypted
          ? "emailBackup.mail.value.encrypted"
          : "emailBackup.mail.value.plain",
      ),
    }),
    attachment,
  };
}

/**
 * 构造测试邮件: 没有附件, 不含任何条目数据.
 * @param translate 取当前语言文案的函数.
 * @param addresses 发件与收件地址.
 * @returns 要发出的邮件.
 */
export function buildTestMail(
  translate: EmailBackupTranslate,
  addresses: MailAddresses,
): OutgoingMail {
  return {
    ...addresses,
    subject: translate("emailBackup.mail.test.subject"),
    text: translate("emailBackup.mail.test.body"),
  };
}
