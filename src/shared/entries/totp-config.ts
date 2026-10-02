/**
 * TOTP 支持的 HMAC 算法, 名称与 otpauth 链接里的 algorithm 参数一致.
 */
export const TOTP_ALGORITHMS = ["SHA1", "SHA256", "SHA512"] as const;

/**
 * TOTP 支持的 HMAC 算法的名称.
 */
export type TotpAlgorithm = (typeof TOTP_ALGORITHMS)[number];

/**
 * TOTP 支持的验证码位数.
 */
export const TOTP_DIGITS_OPTIONS = [6, 8] as const;

/**
 * TOTP 支持的验证码位数的取值.
 */
export type TotpDigits = (typeof TOTP_DIGITS_OPTIONS)[number];

/**
 * 没有给出算法时采用的 HMAC 算法.
 */
export const DEFAULT_TOTP_ALGORITHM: TotpAlgorithm = "SHA1";

/**
 * 没有给出位数时采用的验证码位数.
 */
export const DEFAULT_TOTP_DIGITS: TotpDigits = 6;

/**
 * 没有给出周期时采用的换码周期, 单位秒.
 */
export const DEFAULT_TOTP_PERIOD_SECONDS = 30;

/**
 * 允许的最长换码周期, 单位秒.
 */
export const MAX_TOTP_PERIOD_SECONDS = 3600;

/**
 * 二维码图片允许的最大字节数, 渲染端选图时先检查, 主进程解码前再检查.
 */
export const MAX_QR_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * 一个条目的 TOTP 配置, 存进加密数据库.
 */
export interface TotpConfig {
  /**
   * 密钥, 规范化的大写 Base32 文本, 不含空格与补位符.
   */
  readonly secret: string;
  /**
   * HMAC 算法.
   */
  readonly algorithm: TotpAlgorithm;
  /**
   * 验证码位数.
   */
  readonly digits: TotpDigits;
  /**
   * 换码周期, 单位秒.
   */
  readonly periodSeconds: number;
}

/**
 * 主进程生成的当前验证码, 渲染端据此显示并倒计时.
 */
export interface TotpCode {
  /**
   * 验证码, 纯数字, 位数与配置一致.
   */
  readonly code: string;
  /**
   * 这个验证码失效的时刻, 毫秒时间戳.
   */
  readonly expiresAt: number;
  /**
   * 换码周期, 单位秒, 用来换算倒计时进度.
   */
  readonly periodSeconds: number;
}

/**
 * 判断一个文本是否是支持的 HMAC 算法的名称.
 * @param value 待判断的文本.
 * @returns 是支持的算法名称时返回 true.
 */
export function isTotpAlgorithm(value: string): value is TotpAlgorithm {
  return TOTP_ALGORITHMS.some((algorithm) => algorithm === value);
}

/**
 * 判断一个数是否是支持的验证码位数.
 * @param value 待判断的数.
 * @returns 是支持的位数时返回 true.
 */
export function isTotpDigits(value: number): value is TotpDigits {
  return TOTP_DIGITS_OPTIONS.some((digits) => digits === value);
}

/**
 * 判断一个数是否是允许的换码周期: 1 秒到上限之间的整数.
 * @param value 待判断的数.
 * @returns 是允许的周期时返回 true.
 */
export function isTotpPeriodSeconds(value: number): boolean {
  return (
    Number.isInteger(value) && value >= 1 && value <= MAX_TOTP_PERIOD_SECONDS
  );
}
