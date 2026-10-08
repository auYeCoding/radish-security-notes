/**
 * 自动锁定的全部原因: 系统空闲, 系统锁屏, 系统休眠.
 */
export const AUTO_LOCK_REASONS = ["idle", "screen-lock", "sleep"] as const;

/**
 * 自动锁定的原因.
 */
export type AutoLockReason = (typeof AUTO_LOCK_REASONS)[number];

/**
 * 判断一个未知值是否是登记过的自动锁定原因.
 * @param value 待判断的值.
 * @returns 是登记过的原因时返回 true.
 */
export function isAutoLockReason(value: unknown): value is AutoLockReason {
  return AUTO_LOCK_REASONS.some((reason) => reason === value);
}
