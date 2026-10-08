import type { AutoLockSettings } from "./auto-lock-settings";
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
  /**
   * 设置侧栏是否折叠, 主进程保存.
   * @param isCollapsed 侧栏是否折叠.
   * @returns 保存完成后兑现.
   */
  setSidebarCollapsed: (isCollapsed: boolean) => Promise<void>;
  /**
   * 设置自动锁定设置, 主进程校验后保存, 下一次检查起生效.
   * @param settings 完整的自动锁定设置.
   * @returns 保存完成后兑现.
   */
  setAutoLock: (settings: AutoLockSettings) => Promise<void>;
  /**
   * 设置是否启用内容保护, 主进程保存并立即应用到全部窗口.
   * @param isEnabled 是否启用.
   * @returns 保存并应用完成后兑现.
   */
  setContentProtection: (isEnabled: boolean) => Promise<void>;
}
