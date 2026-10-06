import { findEmailBackupSettingsProblems } from "@shared/email-backup/email-backup-settings-rules";
import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";
import type {
  EmailBackupSettings,
  EmailBackupSettingsInput,
} from "@shared/email-backup/email-backup-settings";
import { EMAIL_PROVIDER_PRESETS } from "@shared/email-backup/email-provider-presets";
import {
  hasConnectionTargetChanged,
  resolveSmtpConnection,
} from "@shared/email-backup/smtp-connection";
import { isExportPassphraseValid } from "@shared/export/export-limits";

import type { EmailBackupCredentials } from "./email-backup-credentials-repository";
import type { EmailBackupStoredState } from "./email-backup-stored-state";

/**
 * 把空串当作没给: 授权码与口令留空表示保持已保存的值不变.
 * @param value 请求里的值.
 * @returns 非空的值, 没给或空串时为 undefined.
 */
function presentOf(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * 判断保存请求是否带了新的授权码, 空串与没给都表示保持不变.
 * @param input 保存设置的请求.
 * @returns 带了新的授权码时为 true.
 */
export function hasNewAuthorizationCode(
  input: EmailBackupSettingsInput,
): boolean {
  return presentOf(input.authorizationCode) !== undefined;
}

/**
 * 由保存请求得出要保存的设置: 地址去首尾空格, 预置类型的服务器取预置表, 加密时不保留明文风险确认
 * (改回明文时要重新确认).
 * @param input 保存设置的请求.
 * @returns 要保存的设置.
 */
export function normalizeSettings(
  input: EmailBackupSettingsInput,
): EmailBackupSettings {
  const trimmed: EmailBackupSettings = {
    provider: input.provider,
    host: input.host.trim(),
    port: input.port,
    security: input.security,
    senderAddress: input.senderAddress.trim(),
    recipientAddress: input.recipientAddress.trim(),
    sizeLimitMebibytes: input.sizeLimitMebibytes,
    isEncrypted: input.isEncrypted,
    hasAcknowledgedPlaintextRisk:
      !input.isEncrypted && input.hasAcknowledgedPlaintextRisk,
  };
  return { ...trimmed, ...resolveSmtpConnection(trimmed) };
}

/**
 * 检查备份口令: 加密时必须有口令, 新给的口令必须符合口令规则.
 * @param input 保存设置的请求.
 * @param settings 要保存的设置.
 * @param stored 已保存的状态.
 * @returns 不通过时的失败原因, 通过时为 undefined.
 */
function findPassphraseRejection(
  input: EmailBackupSettingsInput,
  settings: EmailBackupSettings,
  stored: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  if (!settings.isEncrypted) {
    return undefined;
  }
  const given = presentOf(input.passphrase);
  if (given === undefined) {
    return stored.credentials.passphrase === undefined
      ? "invalid-passphrase"
      : undefined;
  }
  return isExportPassphraseValid(given) ? undefined : "invalid-passphrase";
}

/**
 * 检查授权码: 必须有授权码, 连接目标变了就必须重新给.
 * @param input 保存设置的请求.
 * @param settings 要保存的设置.
 * @param stored 已保存的状态.
 * @returns 不通过时的失败原因, 通过时为 undefined.
 */
function findAuthorizationCodeRejection(
  input: EmailBackupSettingsInput,
  settings: EmailBackupSettings,
  stored: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  if (presentOf(input.authorizationCode) !== undefined) {
    return undefined;
  }
  const isTargetChanged =
    stored.isSaved && hasConnectionTargetChanged(settings, stored.settings);
  return stored.credentials.authorizationCode === undefined || isTargetChanged
    ? "authorization-code-required"
    : undefined;
}

/**
 * 找出保存请求里第一个不通过的检查, 都不需要读主密码, 代价从小到大.
 * @param input 保存设置的请求.
 * @param settings 要保存的设置.
 * @param stored 已保存的状态.
 * @returns 不通过时的失败原因, 都通过时为 undefined.
 */
export function findSaveRejection(
  input: EmailBackupSettingsInput,
  settings: EmailBackupSettings,
  stored: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  if (!EMAIL_PROVIDER_PRESETS[settings.provider].isSupported) {
    return "unsupported-provider";
  }
  if (findEmailBackupSettingsProblems(settings).length > 0) {
    return "invalid-settings";
  }
  if (!settings.isEncrypted && !settings.hasAcknowledgedPlaintextRisk) {
    return "plaintext-not-acknowledged";
  }
  return (
    findPassphraseRejection(input, settings, stored) ??
    findAuthorizationCodeRejection(input, settings, stored)
  );
}

/**
 * 合并要保存的机密: 请求里给了新的就用新的, 没给就保持已保存的; 不加密时不保留口令.
 * @param input 保存设置的请求.
 * @param settings 要保存的设置.
 * @param stored 已保存的状态.
 * @returns 要保存的机密.
 */
export function mergeCredentials(
  input: EmailBackupSettingsInput,
  settings: EmailBackupSettings,
  stored: EmailBackupStoredState,
): EmailBackupCredentials {
  return {
    authorizationCode:
      presentOf(input.authorizationCode) ??
      stored.credentials.authorizationCode,
    passphrase: settings.isEncrypted
      ? (presentOf(input.passphrase) ?? stored.credentials.passphrase)
      : undefined,
  };
}
