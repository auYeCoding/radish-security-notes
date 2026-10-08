import type { AutoLockSettings } from "@shared/preferences/auto-lock-settings";
import type { AutoLockReason } from "@shared/vault/auto-lock-reason";

import {
  AUTO_LOCK_DEFERRAL_LIMIT_CHECKS,
  SECONDS_PER_MINUTE,
} from "./auto-lock-timing";

/**
 * 每种自动锁定原因对应的设置开关.
 */
const REASON_SWITCH_KEYS = {
  idle: "isIdleLockEnabled",
  "screen-lock": "isScreenLockEnabled",
  sleep: "isSleepLockEnabled",
} as const satisfies Record<AutoLockReason, keyof AutoLockSettings>;

/**
 * 判断一种自动锁定原因在当前设置里是否开启.
 * @param settings 自动锁定设置.
 * @param reason 自动锁定原因.
 * @returns 对应的开关开启时为 true.
 */
export function isReasonEnabled(
  settings: AutoLockSettings,
  reason: AutoLockReason,
): boolean {
  return settings[REASON_SWITCH_KEYS[reason]];
}

/**
 * 判断系统空闲是否已达到设置的时长.
 * @param settings 自动锁定设置.
 * @param idleSeconds 系统已空闲的秒数.
 * @returns 空闲秒数不小于设置的时长时为 true.
 */
export function hasIdleReached(
  settings: AutoLockSettings,
  idleSeconds: number,
): boolean {
  return idleSeconds >= settings.idleMinutes * SECONDS_PER_MINUTE;
}

/**
 * 判断被进行中任务挡住的自动锁定是否到了该强制的时候.
 * @param deferredChecks 此前已被任务挡住的次数.
 * @returns 达到推迟上限时为 true.
 */
export function shouldForceLock(deferredChecks: number): boolean {
  return deferredChecks >= AUTO_LOCK_DEFERRAL_LIMIT_CHECKS;
}
