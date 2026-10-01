import type { SupportedLanguage } from "./language";
import type { PreferencesSnapshot } from "./preferences-snapshot";
import type { ThemeSource } from "./theme-source";

/**
 * preload 暴露给渲染进程的偏好接口, 渲染进程只经它读写偏好.
 */
export interface PreferencesBridge {
  /**
   * 读取当前偏好快照.
   * @returns 偏好快照.
   */
  getSnapshot: () => Promise<PreferencesSnapshot>;
  /**
   * 设置主题来源, 主进程保存并应用.
   * @param themeSource 新的主题来源.
   * @returns 保存完成后兑现.
   */
  setThemeSource: (themeSource: ThemeSource) => Promise<void>;
  /**
   * 设置界面语言, 主进程保存并切换自己的 i18n 实例.
   * @param language 新的界面语言.
   * @returns 保存完成后兑现.
   */
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}
