/**
 * 临近换码的提示阈值, 单位秒: 剩余时间不超过它时提示即将换码.
 */
export const TOTP_ENDING_THRESHOLD_SECONDS = 10;

/**
 * 一个周期里提示阈值最多占的份数, 避免周期很短时一直处于提示状态.
 */
const ENDING_PERIOD_FRACTION = 3;

/**
 * 倒计时的显示状态.
 */
export interface TotpCountdownState {
  /**
   * 距离换码的剩余秒数, 向上取整, 不小于 0, 不大于周期.
   */
  readonly remainingSeconds: number;
  /**
   * 是否临近换码.
   */
  readonly isEnding: boolean;
}

/**
 * 按失效时刻与当前时刻计算倒计时的显示状态. 提示阈值是 10 秒与周期三分之一中较小的一个.
 * @param expiresAt 验证码失效的时刻, 毫秒时间戳.
 * @param now 当前时刻, 毫秒时间戳.
 * @param periodSeconds 换码周期, 单位秒.
 * @returns 剩余秒数与是否临近换码.
 */
export function computeTotpCountdown(
  expiresAt: number,
  now: number,
  periodSeconds: number,
): TotpCountdownState {
  const remainingSeconds = Math.min(
    periodSeconds,
    Math.max(0, Math.ceil((expiresAt - now) / 1000)),
  );
  const endingSeconds = Math.min(
    TOTP_ENDING_THRESHOLD_SECONDS,
    Math.floor(periodSeconds / ENDING_PERIOD_FRACTION),
  );
  return { remainingSeconds, isEnding: remainingSeconds <= endingSeconds };
}
