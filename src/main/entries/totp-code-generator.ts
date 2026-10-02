import { TOTP } from "otpauth";

import type { TotpCode, TotpConfig } from "@shared/entries/totp-config";

/**
 * 按配置生成某个时刻的验证码. 验证码在一个周期内不变, 失效时刻是下一个周期的开始.
 * @param config 条目的 TOTP 配置.
 * @param timestamp 生成验证码的时刻, 毫秒时间戳.
 * @returns 验证码, 失效时刻与周期.
 */
export function generateTotpCode(
  config: TotpConfig,
  timestamp: number,
): TotpCode {
  const totp = new TOTP({
    secret: config.secret,
    algorithm: config.algorithm,
    digits: config.digits,
    period: config.periodSeconds,
  });
  return {
    code: totp.generate({ timestamp }),
    expiresAt: timestamp + totp.remaining({ timestamp }),
    periodSeconds: config.periodSeconds,
  };
}
