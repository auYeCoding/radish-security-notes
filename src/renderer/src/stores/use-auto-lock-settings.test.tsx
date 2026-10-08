import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUTO_LOCK_SETTINGS,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";

import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import {
  useAutoLockSettings,
  type AutoLockSwitchKey,
} from "./use-auto-lock-settings";

/**
 * 设置里取值为布尔的字段名, 手写在测试里作为 `AutoLockSwitchKey` 的独立对照.
 */
const EXPECTED_SWITCH_KEYS = [
  "isIdleLockEnabled",
  "isScreenLockEnabled",
  "isSleepLockEnabled",
] as const satisfies readonly AutoLockSwitchKey[];

/**
 * 编译期断言: `AutoLockSwitchKey` 不多于上面三个字段. 设置里新增布尔字段而这里没跟上时, 这一行
 * 类型检查报错.
 */
const NO_OTHER_SWITCH_KEYS: Exclude<
  AutoLockSwitchKey,
  (typeof EXPECTED_SWITCH_KEYS)[number]
> extends never
  ? true
  : false = true;

describe("AutoLockSwitchKey 由设置类型派生", () => {
  it("与默认设置里取值为布尔的字段一一对应", () => {
    const booleanFields = Object.entries(DEFAULT_AUTO_LOCK_SETTINGS)
      .filter(([, value]) => typeof value === "boolean")
      .map(([key]) => key);

    expect(NO_OTHER_SWITCH_KEYS).toBe(true);
    expect([...EXPECTED_SWITCH_KEYS].sort()).toEqual(booleanFields.sort());
  });
});

describe("useAutoLockSettings 修改开关", () => {
  it.each(EXPECTED_SWITCH_KEYS)(
    "%s 关闭时以当前设置为底整体保存",
    async (key) => {
      const setAutoLock = vi.fn(() => Promise.resolve());
      const environment = await createPreferencesTestEnvironment({
        setAutoLock,
      });
      const { result } = renderHook(() => useAutoLockSettings(), {
        wrapper: environment.Providers,
      });

      result.current.setSwitch(key, false);

      const expected: AutoLockSettings = {
        ...DEFAULT_AUTO_LOCK_SETTINGS,
        [key]: false,
      };
      await waitFor(() => expect(setAutoLock).toHaveBeenCalledWith(expected));
    },
  );

  it("保存被拒绝时设置保持原样, 不产生未处理的拒绝", async () => {
    const setAutoLock = vi.fn(() => Promise.reject(new Error("ipc down")));
    const environment = await createPreferencesTestEnvironment({ setAutoLock });
    const { result } = renderHook(() => useAutoLockSettings(), {
      wrapper: environment.Providers,
    });

    result.current.setSwitch("isIdleLockEnabled", false);
    result.current.setIdleMinutes(30);

    await waitFor(() => expect(setAutoLock).toHaveBeenCalledTimes(2));
    expect(result.current.settings).toEqual(DEFAULT_AUTO_LOCK_SETTINGS);
  });
});
