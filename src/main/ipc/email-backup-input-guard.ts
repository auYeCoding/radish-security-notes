import {
  EMAIL_ADDRESS_MAX_LENGTH,
  SMTP_HOST_MAX_LENGTH,
} from "@shared/email-backup/email-backup-limits";
import type { EmailBackupRunRequest } from "@shared/email-backup/email-backup-result";
import type {
  EmailBackupSettings,
  EmailBackupSettingsInput,
} from "@shared/email-backup/email-backup-settings";
import {
  isEmailConnectionSecurity,
  isEmailProviderKey,
} from "@shared/email-backup/email-provider-presets";

import { isOptionalSecret, isRecord, isStringWithin } from "./ipc-input-checks";

/**
 * 邮箱备份参数不合规时的错误信息.
 */
const INVALID_EMAIL_BACKUP_ARGUMENT_MESSAGE = "无效的邮箱备份参数";

/**
 * 判断设置里的文本字段类型与长度是否合规: 服务器地址与两个邮箱地址.
 * @param value 渲染进程传来的对象.
 * @returns 合规时返回 true.
 */
function hasValidTextFields(value: Record<string, unknown>): boolean {
  return (
    isStringWithin(value["host"], SMTP_HOST_MAX_LENGTH) &&
    isStringWithin(value["senderAddress"], EMAIL_ADDRESS_MAX_LENGTH) &&
    isStringWithin(value["recipientAddress"], EMAIL_ADDRESS_MAX_LENGTH)
  );
}

/**
 * 判断设置里的选项, 数字与标志字段类型是否合规. 数值是否在范围内由设置规则判断.
 * @param value 渲染进程传来的对象.
 * @returns 合规时返回 true.
 */
function hasValidOptionFields(value: Record<string, unknown>): boolean {
  return (
    isEmailProviderKey(value["provider"]) &&
    isEmailConnectionSecurity(value["security"]) &&
    typeof value["port"] === "number" &&
    typeof value["sizeLimitMebibytes"] === "number" &&
    typeof value["isEncrypted"] === "boolean" &&
    typeof value["hasAcknowledgedPlaintextRisk"] === "boolean"
  );
}

/**
 * 校验渲染进程传来的设置字段, 返回只含已知键的设置.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的设置.
 * @throws Error 当参数不是合规的设置时.
 */
function requireSettings(value: unknown): EmailBackupSettings {
  if (
    !isRecord(value) ||
    !hasValidTextFields(value) ||
    !hasValidOptionFields(value)
  ) {
    throw new Error(INVALID_EMAIL_BACKUP_ARGUMENT_MESSAGE);
  }
  return {
    provider: value["provider"] as EmailBackupSettings["provider"],
    host: value["host"] as string,
    port: value["port"] as number,
    security: value["security"] as EmailBackupSettings["security"],
    senderAddress: value["senderAddress"] as string,
    recipientAddress: value["recipientAddress"] as string,
    sizeLimitMebibytes: value["sizeLimitMebibytes"] as number,
    isEncrypted: value["isEncrypted"] as boolean,
    hasAcknowledgedPlaintextRisk: value[
      "hasAcknowledgedPlaintextRisk"
    ] as boolean,
  };
}

/**
 * 校验渲染进程传来的保存设置请求: 设置字段的类型与长度合规, 授权码, 口令与主密码是没给或长度
 * 不超过上限的字符串. 多余的键被丢弃. 字段取值是否合理, 授权码对不对, 主密码对不对由服务判断.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的请求.
 * @throws Error 当参数不是合规的请求时.
 */
export function requireEmailBackupSettingsInput(
  value: unknown,
): EmailBackupSettingsInput {
  const settings = requireSettings(value);
  const secrets = value as Record<string, unknown>;
  if (
    !isOptionalSecret(secrets["authorizationCode"]) ||
    !isOptionalSecret(secrets["passphrase"]) ||
    !isOptionalSecret(secrets["masterPassword"])
  ) {
    throw new Error(INVALID_EMAIL_BACKUP_ARGUMENT_MESSAGE);
  }
  return {
    ...settings,
    ...(secrets["authorizationCode"] === undefined
      ? {}
      : { authorizationCode: secrets["authorizationCode"] }),
    ...(secrets["passphrase"] === undefined
      ? {}
      : { passphrase: secrets["passphrase"] }),
    ...(secrets["masterPassword"] === undefined
      ? {}
      : { masterPassword: secrets["masterPassword"] }),
  };
}

/**
 * 校验渲染进程传来的立即备份请求: 去附件标志是布尔值, 主密码是没给或长度不超过上限的字符串.
 * 多余的键被丢弃. 主密码对不对由服务判断.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的请求.
 * @throws Error 当参数不是合规的请求时.
 */
export function requireEmailBackupRunRequest(
  value: unknown,
): EmailBackupRunRequest {
  if (
    !isRecord(value) ||
    typeof value["withoutAttachments"] !== "boolean" ||
    !isOptionalSecret(value["masterPassword"])
  ) {
    throw new Error(INVALID_EMAIL_BACKUP_ARGUMENT_MESSAGE);
  }
  return {
    withoutAttachments: value["withoutAttachments"],
    ...(value["masterPassword"] === undefined
      ? {}
      : { masterPassword: value["masterPassword"] }),
  };
}
