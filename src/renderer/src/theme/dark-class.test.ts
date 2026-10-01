import { describe, expect, it } from "vitest";

import bootstrapScript from "../../public/theme-bootstrap.js?raw";
import {
  DARK_CLASS_NAME,
  DARK_COLOR_SCHEME_QUERY,
  followSystemTheme,
  type DarkSchemeSource,
} from "./dark-class";

/**
 * 可手动触发变化的假媒体查询.
 */
interface FakeDarkSchemeSource extends DarkSchemeSource {
  /**
   * 改变匹配结果并通知监听者.
   * @param matches 新的匹配结果.
   */
  emit: (matches: boolean) => void;
  /**
   * 当前注册的监听者数量.
   */
  readonly listenerCount: () => number;
}

/**
 * 创建假的深色外观媒体查询.
 * @param initialMatches 初始匹配结果.
 * @returns 假媒体查询.
 */
function createFakeSource(initialMatches: boolean): FakeDarkSchemeSource {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const state = { matches: initialMatches };
  return {
    get matches() {
      return state.matches;
    },
    addEventListener: (_type: string, listener: unknown) => {
      listeners.add(listener as (event: MediaQueryListEvent) => void);
    },
    removeEventListener: (_type: string, listener: unknown) => {
      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    },
    emit: (matches) => {
      state.matches = matches;
      listeners.forEach((listener) =>
        listener({ matches } as MediaQueryListEvent),
      );
    },
    listenerCount: () => listeners.size,
  };
}

describe("followSystemTheme", () => {
  it("立即按当前外观设置深色类名", () => {
    const root = document.createElement("html");

    followSystemTheme(root, createFakeSource(true));

    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(true);
  });

  it("外观变化时切换类名", () => {
    const root = document.createElement("html");
    const source = createFakeSource(false);
    followSystemTheme(root, source);

    source.emit(true);
    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(true);
    source.emit(false);
    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(false);
  });

  it("取消跟随后不再响应变化", () => {
    const root = document.createElement("html");
    const source = createFakeSource(false);
    const stop = followSystemTheme(root, source);

    stop();
    source.emit(true);

    expect(source.listenerCount()).toBe(0);
    expect(root.classList.contains(DARK_CLASS_NAME)).toBe(false);
  });
});

describe("首帧主题脚本", () => {
  it("使用与 TypeScript 模块相同的类名与媒体查询", () => {
    expect(bootstrapScript).toContain(`"${DARK_CLASS_NAME}"`);
    expect(bootstrapScript).toContain(`"${DARK_COLOR_SCHEME_QUERY}"`);
  });
});
