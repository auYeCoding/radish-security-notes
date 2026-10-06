/**
 * 自动备份可选的间隔, 固定毫秒数, 不随夏令时与月份变化.
 */
export const AUTO_BACKUP_INTERVALS = [
  "daily",
  "every-3-days",
  "weekly",
] as const;

/**
 * 自动备份的间隔.
 */
export type AutoBackupInterval = (typeof AUTO_BACKUP_INTERVALS)[number];

/**
 * 没选过间隔时的默认间隔.
 */
export const DEFAULT_AUTO_BACKUP_INTERVAL: AutoBackupInterval = "daily";

/**
 * 一天的毫秒数.
 */
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 每种间隔对应的毫秒数.
 */
export const AUTO_BACKUP_INTERVAL_MILLISECONDS: Readonly<
  Record<AutoBackupInterval, number>
> = {
  daily: MILLISECONDS_PER_DAY,
  "every-3-days": 3 * MILLISECONDS_PER_DAY,
  weekly: 7 * MILLISECONDS_PER_DAY,
};

/**
 * 判断一个值是否是登记过的自动备份间隔.
 * @param value 待判断的值.
 * @returns 是登记过的间隔时返回 true.
 */
export function isAutoBackupInterval(
  value: unknown,
): value is AutoBackupInterval {
  return AUTO_BACKUP_INTERVALS.some((interval) => interval === value);
}
