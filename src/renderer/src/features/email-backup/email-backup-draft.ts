import type {
  EmailBackupSettings,
  EmailBackupSettingsInput,
  EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";
import {
  EMAIL_PROVIDER_PRESETS,
  type EmailConnectionSecurity,
  type EmailProviderKey,
} from "@shared/email-backup/email-provider-presets";

/**
 * 邮箱备份对话框里用户正在填写的内容. 数字字段按文本保存, 提交时再转成数字; 授权码, 口令与主密码
 * 只在这里存在, 保存成功后清空 (主密码留到对话框关闭).
 */
export interface EmailBackupDraft {
  /**
   * 邮箱类型.
   */
  readonly provider: EmailProviderKey;
  /**
   * 自定义类型的服务器地址.
   */
  readonly host: string;
  /**
   * 自定义类型的端口, 文本.
   */
  readonly port: string;
  /**
   * 自定义类型的加密连接方式.
   */
  readonly security: EmailConnectionSecurity;
  /**
   * 发件邮箱地址.
   */
  readonly senderAddress: string;
  /**
   * 收件邮箱地址, 空串表示与发件邮箱相同.
   */
  readonly recipientAddress: string;
  /**
   * 单封邮件大小上限, 单位 MB, 文本.
   */
  readonly sizeLimitMebibytes: string;
  /**
   * 备份是否用口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 是否已确认明文备份的风险.
   */
  readonly hasAcknowledgedPlaintextRisk: boolean;
  /**
   * 新填写的授权码, 空串表示保持已保存的授权码.
   */
  readonly authorizationCode: string;
  /**
   * 新填写的备份口令, 空串表示保持已保存的口令.
   */
  readonly passphrase: string;
  /**
   * 确认口令.
   */
  readonly passphraseConfirmation: string;
  /**
   * 重新输入的主密码.
   */
  readonly masterPassword: string;
}

/**
 * 由主进程返回的设置视图得出对话框的初始填写内容, 机密字段都是空的.
 * @param view 设置视图.
 * @returns 填写内容.
 */
export function draftFromView(view: EmailBackupSettingsView): EmailBackupDraft {
  return {
    provider: view.provider,
    host: view.host,
    port: String(view.port),
    security: view.security,
    senderAddress: view.senderAddress,
    recipientAddress: view.recipientAddress,
    sizeLimitMebibytes: String(view.sizeLimitMebibytes),
    isEncrypted: view.isEncrypted,
    hasAcknowledgedPlaintextRisk: view.hasAcknowledgedPlaintextRisk,
    authorizationCode: "",
    passphrase: "",
    passphraseConfirmation: "",
    masterPassword: "",
  };
}

/**
 * 由填写内容得出设置: 文本转数字, 地址去首尾空格, 与主进程保存前的整理一致.
 * @param draft 填写内容.
 * @returns 设置.
 */
export function settingsOfDraft(draft: EmailBackupDraft): EmailBackupSettings {
  return {
    provider: draft.provider,
    host: draft.host.trim(),
    port: Number(draft.port),
    security: draft.security,
    senderAddress: draft.senderAddress.trim(),
    recipientAddress: draft.recipientAddress.trim(),
    sizeLimitMebibytes: Number(draft.sizeLimitMebibytes),
    isEncrypted: draft.isEncrypted,
    hasAcknowledgedPlaintextRisk: draft.hasAcknowledgedPlaintextRisk,
  };
}

/**
 * 由填写内容得出送给主进程的保存请求: 空的授权码, 口令与主密码不带, 不加密时不带口令.
 * @param draft 填写内容.
 * @returns 保存设置的请求.
 */
export function toSettingsInput(
  draft: EmailBackupDraft,
): EmailBackupSettingsInput {
  return {
    ...settingsOfDraft(draft),
    ...(draft.authorizationCode === ""
      ? {}
      : { authorizationCode: draft.authorizationCode }),
    ...(draft.isEncrypted && draft.passphrase !== ""
      ? { passphrase: draft.passphrase }
      : {}),
    ...(draft.masterPassword === ""
      ? {}
      : { masterPassword: draft.masterPassword }),
  };
}

/**
 * 换一种邮箱类型: 服务器, 端口, 连接方式与单封上限换成这种类型的预置值, 自定义类型的服务器地址
 * 留空等用户填写.
 * @param draft 填写内容.
 * @param provider 新选的邮箱类型.
 * @returns 换类型之后的填写内容.
 */
export function applyProvider(
  draft: EmailBackupDraft,
  provider: EmailProviderKey,
): EmailBackupDraft {
  const preset = EMAIL_PROVIDER_PRESETS[provider];
  return {
    ...draft,
    provider,
    host: preset.host,
    port: String(preset.port),
    security: preset.security,
    sizeLimitMebibytes: String(preset.sizeLimitMebibytes),
  };
}
