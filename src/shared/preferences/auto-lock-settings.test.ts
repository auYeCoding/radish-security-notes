import { describe, expect, it } from "vitest";

import {
  AUTO_LOCK_IDLE_MINUTES_OPTIONS,
  DEFAULT_AUTO_LOCK_SETTINGS,
  isAutoLockIdleMinutes,
  isAutoLockSettings,
  normalizeAutoLockSettings,
} from "./auto-lock-settings";

describe("DEFAULT_AUTO_LOCK_SETTINGS", () => {
  it("三种触发都开启, 空闲 15 分钟, 15 分钟是可选档位之一", () => {
    expect(DEFAULT_AUTO_LOCK_SETTINGS).toEqual({
      isIdleLockEnabled: true,
      idleMinutes: 15,
      isScreenLockEnabled: true,
      isSleepLockEnabled: true,
    });
    expect(AUTO_LOCK_IDLE_MINUTES_OPTIONS).toContain(
      DEFAULT_AUTO_LOCK_SETTINGS.idleMinutes,
    );
  });
});

describe("isAutoLockIdleMinutes", () => {
  it.each([1, 5, 15, 30, 60])("接受档位 %s", (minutes) => {
    expect(isAutoLockIdleMinutes(minutes)).toBe(true);
  });

  it.each([0, 2, 90, "15", undefined, null])("拒绝 %s", (value) => {
    expect(isAutoLockIdleMinutes(value)).toBe(false);
  });
});

describe("isAutoLockSettings", () => {
  it("接受完整合法的设置", () => {
    expect(isAutoLockSettings({ ...DEFAULT_AUTO_LOCK_SETTINGS })).toBe(true);
  });

  it.each([
    ["不是对象", "settings"],
    ["null", null],
    ["缺少字段", { isIdleLockEnabled: true, idleMinutes: 15 }],
    ["时长不在档位里", { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 7 }],
    [
      "开关不是布尔值",
      { ...DEFAULT_AUTO_LOCK_SETTINGS, isSleepLockEnabled: "yes" },
    ],
  ])("拒绝 %s", (_name, value) => {
    expect(isAutoLockSettings(value)).toBe(false);
  });
});

describe("normalizeAutoLockSettings", () => {
  it("没有存储值时取默认设置", () => {
    expect(normalizeAutoLockSettings(undefined)).toEqual(
      DEFAULT_AUTO_LOCK_SETTINGS,
    );
  });

  it.each(["text", 12, null, true, []])(
    "存储值是 %s 时取默认设置",
    (stored) => {
      expect(normalizeAutoLockSettings(stored)).toEqual(
        DEFAULT_AUTO_LOCK_SETTINGS,
      );
    },
  );

  it("合法的存储值原样保留", () => {
    const stored = {
      isIdleLockEnabled: false,
      idleMinutes: 60,
      isScreenLockEnabled: false,
      isSleepLockEnabled: true,
    };

    expect(normalizeAutoLockSettings(stored)).toEqual(stored);
  });

  it("不合法的字段逐个回落默认值, 合法的字段保留", () => {
    const stored = {
      isIdleLockEnabled: "yes",
      idleMinutes: 7,
      isScreenLockEnabled: false,
      isSleepLockEnabled: 1,
    };

    expect(normalizeAutoLockSettings(stored)).toEqual({
      isIdleLockEnabled: true,
      idleMinutes: 15,
      isScreenLockEnabled: false,
      isSleepLockEnabled: true,
    });
  });

  it("缺失的字段取默认值, 多余的字段被丢弃", () => {
    const stored = { idleMinutes: 5, unknownField: "x" };

    expect(normalizeAutoLockSettings(stored)).toEqual({
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      idleMinutes: 5,
    });
  });
});
