import type { SupportedLanguage } from "@shared/preferences/language";
import type { PreferencesSnapshot } from "@shared/preferences/preferences-snapshot";
import type { ThemeSource } from "@shared/preferences/theme-source";
import type { i18n } from "i18next";

import type { ThemeController } from "../theme/theme-controller";
import type { PreferencesStore } from "./preferences-store";

/**
 * 偏好服务的依赖.
 */
export interface PreferencesServiceDependencies {
  /**
   * 偏好存储.
   */
  readonly store: PreferencesStore;
  /**
   * 主题控制器.
   */
  readonly themeController: ThemeController;
  /**
   * 主进程的 i18next 实例.
   */
  readonly i18n: i18n;
  /**
   * 系统语言代码, 用户没有选择过语言时据此取默认.
   */
  readonly systemLocale: string;
  /**
   * 是否启用开发用的伪本地化.
   */
  readonly isPseudoLocalizationEnabled: boolean;
}

/**
 * 偏好服务: 把偏好存储, 主题控制器与主进程 i18n 串成读写偏好的业务入口.
 */
export class PreferencesService {
  /**
   * 界面语言变化的订阅者.
   */
  private readonly languageListeners: Array<
    (language: SupportedLanguage) => void
  > = [];

  /**
   * 创建偏好服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: PreferencesServiceDependencies) {}

  /**
   * 读取当前偏好快照.
   * @returns 偏好快照.
   */
  getSnapshot(): PreferencesSnapshot {
    const { store, systemLocale, isPseudoLocalizationEnabled } =
      this.dependencies;
    return {
      themeSource: store.getThemeSource(),
      language: store.getLanguage(systemLocale),
      isSidebarCollapsed: store.isSidebarCollapsed(),
      isPseudoLocalizationEnabled,
    };
  }

  /**
   * 保存并应用主题来源.
   * @param themeSource 新的主题来源.
   */
  setThemeSource(themeSource: ThemeSource): void {
    this.dependencies.store.setThemeSource(themeSource);
    this.dependencies.themeController.apply(themeSource);
  }

  /**
   * 保存界面语言, 切换主进程 i18n 实例并通知订阅者.
   * @param language 新的界面语言.
   * @returns 切换完成后兑现.
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    this.dependencies.store.setLanguage(language);
    await this.dependencies.i18n.changeLanguage(language);
    this.languageListeners.forEach((listener) => listener(language));
  }

  /**
   * 保存侧栏是否折叠.
   * @param isCollapsed 侧栏是否折叠.
   */
  setSidebarCollapsed(isCollapsed: boolean): void {
    this.dependencies.store.setSidebarCollapsed(isCollapsed);
  }

  /**
   * 订阅界面语言的变化.
   * @param listener 语言变化时的回调.
   */
  onLanguageChanged(listener: (language: SupportedLanguage) => void): void {
    this.languageListeners.push(listener);
  }
}
