import type { SMTPTransportOptions } from "nodemailer";

import type { SmtpConnection } from "@shared/email-backup/smtp-connection";

import type { SmtpCredentials } from "./mail-sender-port";

/**
 * 建立连接最多等待的毫秒数.
 */
export const SMTP_CONNECTION_TIMEOUT_MILLISECONDS = 30000;

/**
 * 等待服务器问候最多的毫秒数.
 */
export const SMTP_GREETING_TIMEOUT_MILLISECONDS = 30000;

/**
 * 连接上没有任何数据往来最多的毫秒数, 备份文件较大时上传需要时间, 所以比建立连接宽松.
 */
export const SMTP_SOCKET_TIMEOUT_MILLISECONDS = 120000;

/**
 * 允许的最低 TLS 版本.
 */
export const SMTP_MINIMUM_TLS_VERSION = "TLSv1.2";

/**
 * 由连接目标与凭据得出 nodemailer 的 SMTP 选项. SSL 连接用 `secure`; STARTTLS 连接用 `requireTLS`,
 * 服务器不支持升级或升级失败时直接失败, 不退回明文. 证书校验沿用 Node 的默认值, 这里不出现
 * `rejectUnauthorized`, `ignoreTLS` 与 `opportunisticTLS`. 不记录任何协议日志, 不允许附件按网址取值.
 * @param connection 要连接的服务器.
 * @param credentials 登录凭据.
 * @returns nodemailer 的 SMTP 选项.
 */
export function buildSmtpTransportOptions(
  connection: SmtpConnection,
  credentials: SmtpCredentials,
): SMTPTransportOptions {
  return {
    host: connection.host,
    port: connection.port,
    secure: connection.security === "ssl",
    requireTLS: connection.security === "starttls",
    auth: { user: credentials.user, pass: credentials.password },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MILLISECONDS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MILLISECONDS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MILLISECONDS,
    logger: false,
    disableUrlAccess: true,
    tls: { minVersion: SMTP_MINIMUM_TLS_VERSION },
  };
}
