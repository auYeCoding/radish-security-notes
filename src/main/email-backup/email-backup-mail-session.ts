import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";
import { resolveRecipientAddress } from "@shared/email-backup/email-backup-settings";
import { EMAIL_PROVIDER_PRESETS } from "@shared/email-backup/email-provider-presets";
import {
  resolveSmtpConnection,
  type SmtpConnection,
} from "@shared/email-backup/smtp-connection";

import type { EmailBackupStoredState } from "./email-backup-stored-state";
import type { MailAddresses } from "./mail-message-builder";
import type { SmtpCredentials } from "./mail-sender-port";

/**
 * 发一封邮件需要的全部连接信息: 服务器, 登录凭据与收发地址.
 */
export interface EmailBackupMailSession {
  /**
   * 要连接的服务器.
   */
  readonly connection: SmtpConnection;
  /**
   * 登录凭据.
   */
  readonly credentials: SmtpCredentials;
  /**
   * 发件与收件地址.
   */
  readonly addresses: MailAddresses;
}

/**
 * 判断已保存的状态能不能用来发邮件: 保存过设置, 有授权码, 邮箱类型是支持的.
 * @param state 邮箱备份状态.
 * @returns 不能发时的失败原因, 能发时为 undefined.
 */
export function findMailSessionRejection(
  state: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  if (!state.isSaved || state.credentials.authorizationCode === undefined) {
    return "not-configured";
  }
  return EMAIL_PROVIDER_PRESETS[state.settings.provider].isSupported
    ? undefined
    : "unsupported-provider";
}

/**
 * 由已保存的状态得出发邮件的连接信息. 调用前必须确认 `findMailSessionRejection` 返回 undefined.
 * @param state 邮箱备份状态.
 * @returns 连接信息.
 * @throws Error 当状态里没有授权码时.
 */
export function toMailSession(
  state: EmailBackupStoredState,
): EmailBackupMailSession {
  const { settings, credentials } = state;
  if (credentials.authorizationCode === undefined) {
    throw new Error("邮箱备份没有授权码");
  }
  return {
    connection: resolveSmtpConnection(settings),
    credentials: {
      user: settings.senderAddress,
      password: credentials.authorizationCode,
    },
    addresses: {
      from: settings.senderAddress,
      to: resolveRecipientAddress(settings),
    },
  };
}
