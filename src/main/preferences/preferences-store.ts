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
} as const;

/**
 * 用户偏好存储: 保存并读取主题来源与界面语言, 读到不合法的值时回退到默认.
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
}
