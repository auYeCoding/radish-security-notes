import { describe, expect, it } from "vitest";

import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";

import {
  hasIdleReached,
  isReasonEnabled,
  shouldForceLock,
} from "./auto-lock-rules";
import {
  AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS,
  AUTO_LOCK_DEFERRAL_LIMIT_CHECKS,
  AUTO_LOCK_DEFERRAL_LIMIT_MILLISECONDS,
} from "./auto-lock-timing";

describe("自动锁定的时间常量", () => {
  it("每 5 秒检查一次, 推迟上限 2 分钟折合 24 次", () => {
    expect(AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS).toBe(5000);
    expect(AUTO_LOCK_DEFERRAL_LIMIT_MILLISECONDS).toBe(120000);
    expect(AUTO_LOCK_DEFERRAL_LIMIT_CHECKS).toBe(24);
  });
});

describe("isReasonEnabled", () => {
  it.each([
    ["idle", "isIdleLockEnabled"],
    ["screen-lock", "isScreenLockEnabled"],
    ["sleep", "isSleepLockEnabled"],
  ] as const)("原因 %s 看开关 %s", (reason, key) => {
    const enabled = { ...DEFAULT_AUTO_LOCK_SETTINGS, [key]: true };
    const disabled = { ...DEFAULT_AUTO_LOCK_SETTINGS, [key]: false };

    expect(isReasonEnabled(enabled, reason)).toBe(true);
    expect(isReasonEnabled(disabled, reason)).toBe(false);
  });

  it("一个开关关闭不影响另外两种原因", () => {
    const settings = {
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      isScreenLockEnabled: false,
    };

    expect(isReasonEnabled(settings, "idle")).toBe(true);
    expect(isReasonEnabled(settings, "sleep")).toBe(true);
  });
});

describe("hasIdleReached", () => {
  it("空闲秒数不小于分钟档位折算的秒数才算到时长", () => {
    const settings = { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 1 } as const;

    expect(hasIdleReached(settings, 59)).toBe(false);
    expect(hasIdleReached(settings, 60)).toBe(true);
    expect(hasIdleReached(settings, 61)).toBe(true);
  });

  it("默认 15 分钟折算成 900 秒", () => {
    expect(hasIdleReached(DEFAULT_AUTO_LOCK_SETTINGS, 899)).toBe(false);
    expect(hasIdleReached(DEFAULT_AUTO_LOCK_SETTINGS, 900)).toBe(true);
  });
});

describe("shouldForceLock", () => {
  it("被挡住的次数达到上限才强制", () => {
    expect(shouldForceLock(0)).toBe(false);
    expect(shouldForceLock(AUTO_LOCK_DEFERRAL_LIMIT_CHECKS - 1)).toBe(false);
    expect(shouldForceLock(AUTO_LOCK_DEFERRAL_LIMIT_CHECKS)).toBe(true);
    expect(shouldForceLock(AUTO_LOCK_DEFERRAL_LIMIT_CHECKS + 5)).toBe(true);
  });
});
