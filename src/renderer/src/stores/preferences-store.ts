import type { PreferencesBridge } from "@shared/preferences/preferences-bridge";
import type { PreferencesSnapshot } from "@shared/preferences/preferences-snapshot";
import type { SupportedLanguage } from "@shared/preferences/language";
import type { ThemeSource } from "@shared/preferences/theme-source";
import type { i18n } from "i18next";
import { createStore, type StoreApi } from "zustand/vanilla";

/**
 * 偏好状态: 用户当前选择的主题来源与界面语言.
 */
export interface PreferencesState {
  /**
   * 用户选择的主题来源.
   */
  readonly themeSource: ThemeSource;
  /**
   * 当前界面语言.
   */
  readonly language: SupportedLanguage;
}

/**
 * 偏好动作: 修改偏好, 先经主进程保存, 成功后才更新界面状态.
 */
export interface PreferencesActions {
  /**
   * 切换主题来源.
   * @param themeSource 新的主题来源.
   * @returns 主进程保存并应用后兑现.
   */
  setThemeSource: (themeSource: ThemeSource) => Promise<void>;
  /**
   * 切换界面语言, 同时切换渲染进程的 i18n 实例.
   * @param language 新的界面语言.
   * @returns 主进程保存并切换后兑现.
   */
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}

/**
 * 偏好 store 的完整形状.
 */
export type PreferencesStore = StoreApi<PreferencesState & PreferencesActions>;

/**
 * 创建偏好 store 的依赖.
 */
export interface PreferencesStoreDependencies {
  /**
   * 主进程提供的偏好接口.
   */
  readonly bridge: PreferencesBridge;
  /**
   * 渲染进程的 i18next 实例.
   */
  readonly i18n: i18n;
  /**
   * 启动时从主进程取得的偏好快照.
   */
  readonly initial: PreferencesSnapshot;
}

/**
 * 创建偏好 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @param dependencies store 的依赖.
 * @returns 偏好 store.
 */
export function createPreferencesStore(
  dependencies: PreferencesStoreDependencies,
): PreferencesStore {
  const { bridge, i18n, initial } = dependencies;
  return createStore<PreferencesState & PreferencesActions>()((set) => ({
    themeSource: initial.themeSource,
    language: initial.language,
    setThemeSource: async (themeSource) => {
      await bridge.setThemeSource(themeSource);
      set({ themeSource });
    },
    setLanguage: async (language) => {
      await bridge.setLanguage(language);
      await i18n.changeLanguage(language);
      set({ language });
    },
  }));
}
