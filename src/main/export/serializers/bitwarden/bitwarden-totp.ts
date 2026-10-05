import { TOTP } from "otpauth";

import {
  DEFAULT_TOTP_ALGORITHM,
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_PERIOD_SECONDS,
  type TotpConfig,
} from "@shared/entries/totp-config";

/**
 * 判断 TOTP 配置的算法, 位数与周期是否都是默认值.
 * @param config TOTP 配置.
 * @returns 都是默认值时返回 true.
 */
function hasDefaultParameters(config: TotpConfig): boolean {
  return (
    config.algorithm === DEFAULT_TOTP_ALGORITHM &&
    config.digits === DEFAULT_TOTP_DIGITS &&
    config.periodSeconds === DEFAULT_TOTP_PERIOD_SECONDS
  );
}

/**
 * 把 TOTP 配置写成 Bitwarden 登录条目的 `totp` 值: 参数都是默认值时只写 Base32 密钥, 这是各管理器
 * 都认得的形式; 否则写 `otpauth://` 链接, 带上算法, 位数与周期, 导入后验证码才不会变.
 * @param config TOTP 配置.
 * @returns 写进 `totp` 的文本.
 */
export function formatBitwardenTotp(config: TotpConfig): string {
  if (hasDefaultParameters(config)) {
    return config.secret;
  }
  return new TOTP({
    secret: config.secret,
    algorithm: config.algorithm,
    digits: config.digits,
    period: config.periodSeconds,
  }).toString();
}
