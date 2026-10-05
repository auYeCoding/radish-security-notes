import type { EmailBackupTranslate } from "@shared/email-backup/email-backup-message-keys";
import {
  emailBackupFailed,
  emailBackupSucceeded,
  type EmailBackupResult,
} from "@shared/email-backup/email-backup-result";

import type { DatabaseAccess } from "../vault/database/database-access";
import { EmailBackupFailureError } from "./email-backup-failure-error";
import {
  findMailSessionRejection,
  toMailSession,
} from "./email-backup-mail-session";
import { readStoredState } from "./email-backup-stored-state";
import { classifyMailSendError } from "./mail-send-error-classifier";
import { buildTestMail } from "./mail-message-builder";
import type { MailSenderPort } from "./mail-sender-port";

/**
 * 测试邮件发送的依赖.
 */
export interface EmailTestSenderDependencies {
  /**
   * 取已解锁数据库与报告失败的依赖.
   */
  readonly database: DatabaseAccess;
  /**
   * 邮件发送能力.
   */
  readonly sender: MailSenderPort;
  /**
   * 取当前语言文案的函数, 邮件模板用.
   */
  readonly translate: EmailBackupTranslate;
}

/**
 * 测试邮件发送: 用已保存的设置发一封不含任何条目数据的邮件, 确认邮箱设置可用. 不记进上次备份
 * 结果.
 */
export class EmailTestSender {
  /**
   * 创建测试邮件发送.
   * @param dependencies 依赖.
   */
  constructor(private readonly dependencies: EmailTestSenderDependencies) {}

  /**
   * 发送测试邮件.
   * @returns 发送成功为成功结果; 没保存设置, 邮箱类型不支持, 认证失败, 连接失败等为失败结果.
   */
  async send(): Promise<EmailBackupResult<undefined>> {
    const { database, sender, translate } = this.dependencies;
    const state = readStoredState(database);
    if (!state.ok) {
      return state;
    }
    const rejection = findMailSessionRejection(state.value);
    if (rejection !== undefined) {
      return emailBackupFailed(rejection);
    }
    const session = toMailSession(state.value);
    try {
      await sender.send(
        session.connection,
        session.credentials,
        buildTestMail(translate, session.addresses),
      );
    } catch (error) {
      const reason = classifyMailSendError(error);
      database.onFailure(new EmailBackupFailureError(reason));
      return emailBackupFailed(reason);
    }
    return emailBackupSucceeded(undefined);
  }
}
