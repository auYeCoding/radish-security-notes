/**
 * 邮箱类型的键, 预置的四种加自定义 SMTP. 登记表与类型都由这一个表推导.
 */
export const EMAIL_PROVIDER_KEYS = [
  "qq",
  "netease163",
  "gmail",
  "outlook",
  "custom",
] as const;

/**
 * 邮箱类型的键.
 */
export type EmailProviderKey = (typeof EMAIL_PROVIDER_KEYS)[number];

/**
 * 加密连接的方式: SSL 是连接一建立就加密, STARTTLS 是先明文握手再升级为加密, 两种都不会在
 * 加密失败时退回明文.
 */
export const EMAIL_CONNECTION_SECURITIES = ["ssl", "starttls"] as const;

/**
 * 加密连接的方式.
 */
export type EmailConnectionSecurity =
  (typeof EMAIL_CONNECTION_SECURITIES)[number];

/**
 * 一种邮箱类型的预置连接信息.
 */
export interface EmailProviderPreset {
  /**
   * 邮箱类型的键.
   */
  readonly key: EmailProviderKey;
  /**
   * SMTP 服务器地址, 自定义类型由用户填写, 这里为空串.
   */
  readonly host: string;
  /**
   * SMTP 服务器端口.
   */
  readonly port: number;
  /**
   * 加密连接的方式.
   */
  readonly security: EmailConnectionSecurity;
  /**
   * 单封邮件大小上限的默认值, 单位 MB, 界面上允许用户修改.
   */
  readonly sizeLimitMebibytes: number;
  /**
   * 本版本是否支持这种邮箱: Outlook 个人账户要求现代认证, 暂不支持.
   */
  readonly isSupported: boolean;
}

/**
 * 全部邮箱类型的预置连接信息. 服务器地址, 端口, 连接方式与单封上限来自各厂商的官方帮助页面
 * (2026-10-05 核实), 厂商的规定可能变化, 所以上限允许用户修改.
 */
export const EMAIL_PROVIDER_PRESETS: Readonly<
  Record<EmailProviderKey, EmailProviderPreset>
> = {
  qq: {
    key: "qq",
    host: "smtp.qq.com",
    port: 465,
    security: "ssl",
    sizeLimitMebibytes: 50,
    isSupported: true,
  },
  netease163: {
    key: "netease163",
    host: "smtp.163.com",
    port: 465,
    security: "ssl",
    sizeLimitMebibytes: 15,
    isSupported: true,
  },
  gmail: {
    key: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    security: "ssl",
    sizeLimitMebibytes: 25,
    isSupported: true,
  },
  outlook: {
    key: "outlook",
    host: "smtp-mail.outlook.com",
    port: 587,
    security: "starttls",
    sizeLimitMebibytes: 25,
    isSupported: false,
  },
  custom: {
    key: "custom",
    host: "",
    port: 465,
    security: "ssl",
    sizeLimitMebibytes: 10,
    isSupported: true,
  },
};

/**
 * 判断一个值是否是登记过的邮箱类型键.
 * @param value 待判断的值.
 * @returns 是登记过的键时返回 true.
 */
export function isEmailProviderKey(value: unknown): value is EmailProviderKey {
  return EMAIL_PROVIDER_KEYS.some((key) => key === value);
}

/**
 * 判断一个值是否是登记过的加密连接方式.
 * @param value 待判断的值.
 * @returns 是登记过的连接方式时返回 true.
 */
export function isEmailConnectionSecurity(
  value: unknown,
): value is EmailConnectionSecurity {
  return EMAIL_CONNECTION_SECURITIES.some((security) => security === value);
}
