import {
  EMAIL_PROVIDER_PRESETS,
  type EmailConnectionSecurity,
  type EmailProviderKey,
} from "./email-provider-presets";

/**
 * 邮箱备份的非保密设置: 用户在对话框里填写的邮箱信息与备份选项.
 */
export interface EmailBackupSettings {
  /**
   * 邮箱类型.
   */
  readonly provider: EmailProviderKey;
  /**
   * SMTP 服务器地址, 只有自定义类型用到, 预置类型取预置表.
   */
  readonly host: string;
  /**
   * SMTP 服务器端口, 只有自定义类型用到, 预置类型取预置表.
   */
  readonly port: number;
  /**
   * 加密连接的方式, 只有自定义类型用到, 预置类型取预置表.
   */
  readonly security: EmailConnectionSecurity;
  /**
   * 发件邮箱地址, 同时是登录 SMTP 服务器的用户名.
   */
  readonly senderAddress: string;
  /**
   * 收件邮箱地址, 空串表示与发件邮箱相同.
   */
  readonly recipientAddress: string;
  /**
   * 单封邮件大小上限, 单位 MB, 以邮箱厂商当前规定为准.
   */
  readonly sizeLimitMebibytes: number;
  /**
   * 备份是否用口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 用户是否已确认明文备份的风险, 不加密时必须为真.
   */
  readonly hasAcknowledgedPlaintextRisk: boolean;
}

/**
 * 主进程交给渲染端的设置视图: 非保密设置加上 "授权码已设置" 一类标志, 授权码与口令本身不在
 * 视图里.
 */
export interface EmailBackupSettingsView extends EmailBackupSettings {
  /**
   * 是否已经保存过设置.
   */
  readonly isSaved: boolean;
  /**
   * 是否已保存授权码.
   */
  readonly hasAuthorizationCode: boolean;
  /**
   * 是否已保存备份口令.
   */
  readonly hasPassphrase: boolean;
  /**
   * 保存设置与立即备份时是否要重新输入主密码, 保险库设了主密码时为真.
   */
  readonly requiresMasterPassword: boolean;
}

/**
 * 保存设置的请求. 授权码, 口令与主密码只经进程间通道送到主进程, 保存后不再返回.
 */
export interface EmailBackupSettingsInput extends EmailBackupSettings {
  /**
   * 新的授权码, 没给或空串表示保持已保存的授权码不变.
   */
  readonly authorizationCode?: string;
  /**
   * 新的备份口令, 没给或空串表示保持已保存的口令不变.
   */
  readonly passphrase?: string;
  /**
   * 用户重新输入的主密码, 保险库没有设主密码时没有这一项.
   */
  readonly masterPassword?: string;
}

/**
 * 还没保存过设置时的默认值: 选第一种预置邮箱, 备份加密, 单封上限取预置表.
 */
export const DEFAULT_EMAIL_BACKUP_SETTINGS: EmailBackupSettings = {
  provider: "qq",
  host: EMAIL_PROVIDER_PRESETS.qq.host,
  port: EMAIL_PROVIDER_PRESETS.qq.port,
  security: EMAIL_PROVIDER_PRESETS.qq.security,
  senderAddress: "",
  recipientAddress: "",
  sizeLimitMebibytes: EMAIL_PROVIDER_PRESETS.qq.sizeLimitMebibytes,
  isEncrypted: true,
  hasAcknowledgedPlaintextRisk: false,
};

/**
 * 取实际的收件邮箱地址: 没另填时就是发件邮箱.
 * @param settings 邮箱备份设置.
 * @returns 收件邮箱地址.
 */
export function resolveRecipientAddress(
  settings: Pick<EmailBackupSettings, "senderAddress" | "recipientAddress">,
): string {
  return settings.recipientAddress === ""
    ? settings.senderAddress
    : settings.recipientAddress;
}
