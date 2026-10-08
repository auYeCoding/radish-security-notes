/**
 * 自动锁定每隔多久检查一次系统空闲与待锁定的任务: 五秒.
 */
export const AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS = 5 * 1000;

/**
 * 自动锁定遇到进行中的任务时最多推迟多久, 超过后忽略任务强制锁定: 两分钟.
 */
export const AUTO_LOCK_DEFERRAL_LIMIT_MILLISECONDS = 2 * 60 * 1000;

/**
 * 推迟上限折合的重试次数: 第一次尝试之后再重试这么多次仍被任务挡住, 下一次就强制锁定.
 */
export const AUTO_LOCK_DEFERRAL_LIMIT_CHECKS = Math.ceil(
  AUTO_LOCK_DEFERRAL_LIMIT_MILLISECONDS / AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS,
);

/**
 * 一分钟的秒数, 空闲时长的分钟档位换算成系统空闲秒数时用.
 */
export const SECONDS_PER_MINUTE = 60;
