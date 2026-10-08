/**
 * 空闲自动锁定可选的时长, 单位是分钟.
 */
export const AUTO_LOCK_IDLE_MINUTES_OPTIONS = [1, 5, 15, 30, 60] as const;

/**
 * 空闲自动锁定的时长, 单位是分钟.
 */
export type AutoLockIdleMinutes =
  (typeof AUTO_LOCK_IDLE_MINUTES_OPTIONS)[number];

/**
 * 自动锁定设置: 空闲, 系统锁屏, 系统休眠三种触发各有开关, 空闲另有时长.
 */
export interface AutoLockSettings {
  /**
   * 是否在系统空闲达到时长后自动锁定.
   */
  readonly isIdleLockEnabled: boolean;
  /**
   * 空闲多久后自动锁定.
   */
  readonly idleMinutes: AutoLockIdleMinutes;
  /**
   * 是否在系统锁屏时自动锁定.
   */
  readonly isScreenLockEnabled: boolean;
  /**
   * 是否在系统休眠时自动锁定.
   */
  readonly isSleepLockEnabled: boolean;
}

/**
 * 没保存过设置时的自动锁定设置: 三种触发都开启, 空闲 15 分钟.
 */
export const DEFAULT_AUTO_LOCK_SETTINGS: AutoLockSettings = {
  isIdleLockEnabled: true,
  idleMinutes: 15,
  isScreenLockEnabled: true,
  isSleepLockEnabled: true,
};

/**
 * 判断一个未知值是否是登记过的空闲时长.
 * @param value 待判断的值.
 * @returns 是登记过的时长时返回 true.
 */
export function isAutoLockIdleMinutes(
  value: unknown,
): value is AutoLockIdleMinutes {
  return AUTO_LOCK_IDLE_MINUTES_OPTIONS.some((minutes) => minutes === value);
}

/**
 * 严格判断一个未知值是否是完整合法的自动锁定设置, 进程边界处校验渲染端传来的值用它.
 * @param value 待判断的值.
 * @returns 四个字段都存在且合法时返回 true.
 */
export function isAutoLockSettings(value: unknown): value is AutoLockSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    "isIdleLockEnabled" in value &&
    typeof value.isIdleLockEnabled === "boolean" &&
    "idleMinutes" in value &&
    isAutoLockIdleMinutes(value.idleMinutes) &&
    "isScreenLockEnabled" in value &&
    typeof value.isScreenLockEnabled === "boolean" &&
    "isSleepLockEnabled" in value &&
    typeof value.isSleepLockEnabled === "boolean"
  );
}

/**
 * 读出存储里的布尔值, 不是布尔值时用默认值.
 * @param stored 存储里的值.
 * @param fallback 默认值.
 * @returns 布尔值.
 */
function readBoolean(stored: unknown, fallback: boolean): boolean {
  return typeof stored === "boolean" ? stored : fallback;
}

/**
 * 把存储里读到的值整理成自动锁定设置: 逐字段校验, 缺失或不合法的字段回落到默认值, 其余字段保留.
 * @param stored 存储里读到的值, 可能是任何东西.
 * @returns 完整合法的自动锁定设置.
 */
export function normalizeAutoLockSettings(stored: unknown): AutoLockSettings {
  const fields: Record<string, unknown> =
    typeof stored === "object" && stored !== null ? { ...stored } : {};
  const defaults = DEFAULT_AUTO_LOCK_SETTINGS;
  return {
    isIdleLockEnabled: readBoolean(
      fields.isIdleLockEnabled,
      defaults.isIdleLockEnabled,
    ),
    idleMinutes: isAutoLockIdleMinutes(fields.idleMinutes)
      ? fields.idleMinutes
      : defaults.idleMinutes,
    isScreenLockEnabled: readBoolean(
      fields.isScreenLockEnabled,
      defaults.isScreenLockEnabled,
    ),
    isSleepLockEnabled: readBoolean(
      fields.isSleepLockEnabled,
      defaults.isSleepLockEnabled,
    ),
  };
}
