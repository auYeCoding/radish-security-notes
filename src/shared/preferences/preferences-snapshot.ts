import type { AutoLockSettings } from "./auto-lock-settings";
import type { SupportedLanguage } from "./language";
import type { ThemeSource } from "./theme-source";

/**
 * 主进程交给渲染进程的偏好快照.
 */
export interface PreferencesSnapshot {
  /**
   * 用户选择的主题来源.
   */
  readonly themeSource: ThemeSource;
  /**
   * 当前界面语言.
   */
  readonly language: SupportedLanguage;
  /**
   * 侧栏是否处于折叠状态, 用户没有折叠过时为 false.
   */
  readonly isSidebarCollapsed: boolean;
  /**
   * 自动锁定设置, 没有保存过时为默认设置.
   */
  readonly autoLock: AutoLockSettings;
  /**
   * 是否启用开发用的伪本地化.
   */
  readonly isPseudoLocalizationEnabled: boolean;
}
