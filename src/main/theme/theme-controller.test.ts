import { describe, expect, it, vi } from "vitest";

import type { ThemeSource } from "@shared/preferences/theme-source";

import type { NativeThemePort } from "./native-theme-port";
import { ThemeController } from "./theme-controller";

/**
 * 假的系统主题, 可手动改变深色状态并触发 updated 事件.
 */
interface FakeNativeTheme extends NativeThemePort {
  /**
   * 设置深色状态并通知订阅者.
   * @param isDark 是否深色.
   */
  emitDark: (isDark: boolean) => void;
}

/**
 * 创建假的系统主题.
 * @returns 假系统主题.
 */
function createFakeNativeTheme(): FakeNativeTheme {
  const listeners: Array<() => void> = [];
  const state = { themeSource: "system" as ThemeSource, isDark: false };
  return {
    get themeSource() {
      return state.themeSource;
    },
    set themeSource(value: ThemeSource) {
      state.themeSource = value;
    },
    get shouldUseDarkColors() {
      return state.isDark;
    },
    on: (_event, listener) => listeners.push(listener),
    emitDark: (isDark) => {
      state.isDark = isDark;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("ThemeController", () => {
  it("apply 把主题来源写入系统主题", () => {
    const nativeTheme = createFakeNativeTheme();
    const controller = new ThemeController(nativeTheme);

    controller.apply("dark");

    expect(nativeTheme.themeSource).toBe("dark");
  });

  it("按系统深色状态报告解析后的明暗主题", () => {
    const nativeTheme = createFakeNativeTheme();
    const controller = new ThemeController(nativeTheme);

    expect(controller.getResolvedTheme()).toBe("light");
    nativeTheme.emitDark(true);
    expect(controller.getResolvedTheme()).toBe("dark");
  });

  it("系统外观变化时通知订阅者新的明暗主题", () => {
    const nativeTheme = createFakeNativeTheme();
    const controller = new ThemeController(nativeTheme);
    const listener = vi.fn();
    controller.onResolvedThemeChanged(listener);

    nativeTheme.emitDark(true);
    nativeTheme.emitDark(false);

    expect(listener.mock.calls).toEqual([["dark"], ["light"]]);
  });
});
