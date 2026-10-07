import { describe, expect, it, vi } from "vitest";

import { createI18nInstance } from "@shared/i18n/create-i18n-instance";

import { createInMemoryKeyValueBackend } from "../testing/in-memory-key-value-backend";
import type { NativeThemePort } from "../theme/native-theme-port";
import { ThemeController } from "../theme/theme-controller";
import { PreferencesService } from "./preferences-service";
import { PreferencesStore } from "./preferences-store";

/**
 * 偏好服务及其依赖, 便于测试断言.
 */
interface ServiceFixture {
  /**
   * 被测的偏好服务.
   */
  readonly service: PreferencesService;
  /**
   * 假系统主题.
   */
  readonly nativeTheme: NativeThemePort;
  /**
   * 内存偏好存储.
   */
  readonly store: PreferencesStore;
}

/**
 * 创建一个带内存存储与假系统主题的偏好服务.
 * @param systemLocale 系统语言代码.
 * @returns 服务与其依赖.
 */
async function createService(systemLocale: string): Promise<ServiceFixture> {
  const store = new PreferencesStore(createInMemoryKeyValueBackend());
  const nativeTheme: NativeThemePort = {
    themeSource: "system",
    shouldUseDarkColors: false,
    on: () => undefined,
  };
  const i18n = await createI18nInstance({
    language: store.getLanguage(systemLocale),
    isPseudoLocalizationEnabled: false,
  });
  const service = new PreferencesService({
    store,
    themeController: new ThemeController(nativeTheme),
    i18n,
    systemLocale,
    isPseudoLocalizationEnabled: false,
  });
  return { service, nativeTheme, store };
}

describe("PreferencesService", () => {
  it("快照默认跟随系统主题与系统语言", async () => {
    const { service } = await createService("zh-CN");

    expect(service.getSnapshot()).toEqual({
      themeSource: "system",
      language: "zh",
      isSidebarCollapsed: false,
      isPseudoLocalizationEnabled: false,
    });
  });

  it("保存侧栏折叠状态后快照带回它", async () => {
    const { service, store } = await createService("en-US");

    service.setSidebarCollapsed(true);

    expect(store.isSidebarCollapsed()).toBe(true);
    expect(service.getSnapshot().isSidebarCollapsed).toBe(true);
  });

  it("切换主题来源时保存并应用到系统主题", async () => {
    const { service, nativeTheme, store } = await createService("en-US");

    service.setThemeSource("dark");

    expect(store.getThemeSource()).toBe("dark");
    expect(nativeTheme.themeSource).toBe("dark");
    expect(service.getSnapshot().themeSource).toBe("dark");
  });

  it("切换语言时保存并通知订阅者", async () => {
    const { service, store } = await createService("en-US");
    const listener = vi.fn();
    service.onLanguageChanged(listener);

    await service.setLanguage("zh");

    expect(store.getLanguage("en-US")).toBe("zh");
    expect(service.getSnapshot().language).toBe("zh");
    expect(listener).toHaveBeenCalledWith("zh");
  });
});
