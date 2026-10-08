import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";
import type { PreferencesBridge } from "@shared/preferences/preferences-bridge";
import type { PreferencesSnapshot } from "@shared/preferences/preferences-snapshot";
import type { i18n } from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { vi } from "vitest";

import {
  createPreferencesStore,
  type PreferencesStore,
} from "@renderer/stores/preferences-store";
import { PreferencesStoreProvider } from "@renderer/stores/preferences-store-provider";

/**
 * 测试用的初始偏好快照: 跟随系统主题与中文.
 */
export const TEST_INITIAL_SNAPSHOT: PreferencesSnapshot = {
  themeSource: "system",
  language: "zh",
  isSidebarCollapsed: false,
  autoLock: DEFAULT_AUTO_LOCK_SETTINGS,
  isContentProtectionEnabled: false,
  isPseudoLocalizationEnabled: false,
};

/**
 * 包裹被测组件的 Provider 的属性.
 */
interface PreferencesTestProvidersProps {
  /**
   * 被测组件.
   */
  readonly children: ReactNode;
}

/**
 * 组件测试用的偏好环境: 假的偏好桥, 真实的偏好 store 与 i18n 实例, 以及包裹组件的
 * Provider.
 */
export interface PreferencesTestEnvironment {
  /**
   * 带间谍方法的假偏好桥.
   */
  readonly bridge: PreferencesBridge;
  /**
   * 被测的偏好 store.
   */
  readonly store: PreferencesStore;
  /**
   * 渲染进程的 i18next 实例.
   */
  readonly i18n: i18n;
  /**
   * 注入 i18n 与偏好 store 的包裹组件, 传给 render 的 wrapper 选项.
   */
  readonly Providers: (
    props: PreferencesTestProvidersProps,
  ) => React.JSX.Element;
}

/**
 * 创建组件测试用的偏好环境, 桥的方法默认都成功兑现.
 * @param bridgeOverrides 覆盖假桥上的方法, 例如让保存失败.
 * @returns 偏好环境.
 */
export async function createPreferencesTestEnvironment(
  bridgeOverrides: Partial<PreferencesBridge> = {},
): Promise<PreferencesTestEnvironment> {
  const bridge: PreferencesBridge = {
    getSnapshot: vi.fn(() => Promise.resolve(TEST_INITIAL_SNAPSHOT)),
    setThemeSource: vi.fn(() => Promise.resolve()),
    setLanguage: vi.fn(() => Promise.resolve()),
    setSidebarCollapsed: vi.fn(() => Promise.resolve()),
    setAutoLock: vi.fn(() => Promise.resolve()),
    setContentProtection: vi.fn(() => Promise.resolve()),
    ...bridgeOverrides,
  };
  const i18nInstance = await createI18nInstance({
    language: TEST_INITIAL_SNAPSHOT.language,
    isPseudoLocalizationEnabled: false,
  });
  const store = createPreferencesStore({
    bridge,
    i18n: i18nInstance,
    initial: TEST_INITIAL_SNAPSHOT,
  });
  const Providers = (
    props: PreferencesTestProvidersProps,
  ): React.JSX.Element => (
    <I18nextProvider i18n={i18nInstance}>
      <PreferencesStoreProvider store={store}>
        {props.children}
      </PreferencesStoreProvider>
    </I18nextProvider>
  );
  return { bridge, store, i18n: i18nInstance, Providers };
}
