import {
  normalizeAutoLockSettings,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";
import {
  isSupportedLanguage,
  resolveLanguageFromLocale,
  type SupportedLanguage,
} from "@shared/preferences/language";
import {
  DEFAULT_THEME_SOURCE,
  isThemeSource,
  type ThemeSource,
} from "@shared/preferences/theme-source";

import type { KeyValueBackend } from "./key-value-backend";

/**
 * 偏好在存储中的键名.
 */
const PREFERENCE_KEYS = {
  themeSource: "themeSource",
  language: "language",
  isSidebarCollapsed: "isSidebarCollapsed",
  autoLock: "autoLock",
} as const;

/**
 * 用户偏好存储: 保存并读取主题来源, 界面语言, 侧栏折叠状态与自动锁定设置, 读到不合法的值时回退到默认.
 */
export class PreferencesStore {
  /**
   * 创建偏好存储.
   * @param backend 底层读写后端.
   */
  constructor(private readonly backend: KeyValueBackend) {}

  /**
   * 读取主题来源.
   * @returns 已保存的主题来源, 没有保存过时为默认值.
   */
  getThemeSource(): ThemeSource {
    const stored = this.backend.get(PREFERENCE_KEYS.themeSource);
    return isThemeSource(stored) ? stored : DEFAULT_THEME_SOURCE;
  }

  /**
   * 保存主题来源.
   * @param themeSource 要保存的主题来源.
   */
  setThemeSource(themeSource: ThemeSource): void {
    this.backend.set(PREFERENCE_KEYS.themeSource, themeSource);
  }

  /**
   * 读取界面语言, 用户没有选择过时跟随系统语言.
   * @param systemLocale 系统语言代码.
   * @returns 已保存的界面语言, 没有保存过时由系统语言换算.
   */
  getLanguage(systemLocale: string): SupportedLanguage {
    const stored = this.backend.get(PREFERENCE_KEYS.language);
    return isSupportedLanguage(stored)
      ? stored
      : resolveLanguageFromLocale(systemLocale);
  }

  /**
   * 保存界面语言.
   * @param language 要保存的界面语言.
   */
  setLanguage(language: SupportedLanguage): void {
    this.backend.set(PREFERENCE_KEYS.language, language);
  }

  /**
   * 读取侧栏是否折叠.
   * @returns 已保存的折叠状态, 没有保存过或存储里的值不是布尔值时为 false.
   */
  isSidebarCollapsed(): boolean {
    return this.backend.get(PREFERENCE_KEYS.isSidebarCollapsed) === true;
  }

  /**
   * 保存侧栏是否折叠.
   * @param isCollapsed 要保存的折叠状态.
   */
  setSidebarCollapsed(isCollapsed: boolean): void {
    this.backend.set(PREFERENCE_KEYS.isSidebarCollapsed, isCollapsed);
  }

  /**
   * 读取自动锁定设置.
   * @returns 已保存的设置, 没有保存过时为默认设置, 存储里个别字段不合法时该字段回落默认.
   */
  getAutoLock(): AutoLockSettings {
    return normalizeAutoLockSettings(
      this.backend.get(PREFERENCE_KEYS.autoLock),
    );
  }

  /**
   * 保存自动锁定设置.
   * @param settings 要保存的完整设置.
   */
  setAutoLock(settings: AutoLockSettings): void {
    this.backend.set(PREFERENCE_KEYS.autoLock, settings);
  }
}
