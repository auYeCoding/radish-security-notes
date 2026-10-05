import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

/**
 * 发送阶段可能得到的失败原因.
 */
export type MailSendFailureReason = Extract<
  EmailBackupFailureReason,
  | "authentication-failed"
  | "connection-failed"
  | "server-rejected-size"
  | "send-failed"
>;

/**
 * 表示认证失败的 nodemailer 错误码.
 */
const AUTHENTICATION_ERROR_CODES: readonly string[] = ["EAUTH", "ENOAUTH"];

/**
 * 表示连接失败的 nodemailer 错误码: 连不上, 超时, 域名解析失败, 加密握手失败.
 */
const CONNECTION_ERROR_CODES: readonly string[] = [
  "ECONNECTION",
  "ESOCKET",
  "ETIMEDOUT",
  "EDNS",
  "ETLS",
];

/**
 * 服务器用来表示认证未通过或需要认证的 SMTP 响应码.
 */
const AUTHENTICATION_RESPONSE_CODES: readonly number[] = [530, 534, 535];

/**
 * 服务器用来表示邮件超出大小限制的 SMTP 响应码.
 */
const SIZE_REJECTION_RESPONSE_CODE = 552;

/**
 * nodemailer 在发出邮件之前发现超出服务器声明的大小时的错误码.
 */
const SIZE_PRECHECK_ERROR_CODE = "EMESSAGE";

/**
 * nodemailer 在发出邮件之前发现超出服务器声明的大小时, 出错的 SMTP 命令.
 */
const SIZE_PRECHECK_COMMAND = "MAIL FROM";

/**
 * 读取错误对象上的一个属性.
 * @param error 抛出的错误.
 * @param name 属性名.
 * @returns 属性值, 错误不是对象或没有这个属性时为 undefined.
 */
function readProperty(error: unknown, name: string): unknown {
  return typeof error === "object" && error !== null && name in error
    ? (error as Record<string, unknown>)[name]
    : undefined;
}

/**
 * 判断是否是认证失败.
 * @param code 错误码.
 * @param responseCode 服务器响应码.
 * @returns 是认证失败时返回 true.
 */
function isAuthenticationFailure(
  code: unknown,
  responseCode: unknown,
): boolean {
  return (
    (typeof code === "string" && AUTHENTICATION_ERROR_CODES.includes(code)) ||
    (typeof responseCode === "number" &&
      AUTHENTICATION_RESPONSE_CODES.includes(responseCode))
  );
}

/**
 * 判断是否是服务器因邮件过大而拒收.
 * @param error 抛出的错误.
 * @param responseCode 服务器响应码.
 * @returns 是邮件过大被拒收时返回 true.
 */
function isSizeRejection(error: unknown, responseCode: unknown): boolean {
  return (
    responseCode === SIZE_REJECTION_RESPONSE_CODE ||
    (readProperty(error, "code") === SIZE_PRECHECK_ERROR_CODE &&
      readProperty(error, "command") === SIZE_PRECHECK_COMMAND)
  );
}

/**
 * 把 nodemailer 抛出的错误换成失败原因. 只看错误码, 响应码与出错的命令, 不读错误消息, 因为消息
 * 里可能带有服务器的响应文本.
 * @param error nodemailer 抛出的错误.
 * @returns 认证失败, 连接失败, 服务器拒收过大, 或其它失败.
 */
export function classifyMailSendError(error: unknown): MailSendFailureReason {
  const code = readProperty(error, "code");
  const responseCode = readProperty(error, "responseCode");
  if (isAuthenticationFailure(code, responseCode)) {
    return "authentication-failed";
  }
  if (isSizeRejection(error, responseCode)) {
    return "server-rejected-size";
  }
  return typeof code === "string" && CONNECTION_ERROR_CODES.includes(code)
    ? "connection-failed"
    : "send-failed";
}
