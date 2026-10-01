import { is } from "@electron-toolkit/utils";
import { app, nativeTheme } from "electron";
import type { i18n } from "i18next";

import {
  PSEUDO_LOCALIZATION_ENVIRONMENT_VARIABLE,
  createMainI18n,
  isPseudoLocalizationEnabled,
} from "../i18n/main-i18n";
import { createElectronStoreBackend } from "../preferences/electron-store-backend";
import { PreferencesService } from "../preferences/preferences-service";
import { PreferencesStore } from "../preferences/preferences-store";
import { ThemeController } from "../theme/theme-controller";

/**
 * 偏好相关的运行时对象.
 */
export interface PreferencesRuntime {
  /**
   * 偏好服务.
   */
  readonly service: PreferencesService;
  /**
   * 主题控制器.
   */
  readonly themeController: ThemeController;
  /**
   * 主进程的 i18next 实例.
   */
  readonly i18n: i18n;
}

/**
 * 创建偏好相关的运行时对象. 主题来源在这里先于任何窗口应用到系统,
 * 这样窗口建好时 `prefers-color-scheme` 与背景色已经正确.
 * 必须在 app ready 之后调用, 因为 `app.getLocale()` 要求如此.
 * @returns 偏好运行时对象.
 */
export async function createPreferencesRuntime(): Promise<PreferencesRuntime> {
  const store = new PreferencesStore(createElectronStoreBackend());
  const themeController = new ThemeController(nativeTheme);
  themeController.apply(store.getThemeSource());
  const systemLocale = app.getLocale();
  const isPseudoActive = isPseudoLocalizationEnabled(
    is.dev,
    process.env[PSEUDO_LOCALIZATION_ENVIRONMENT_VARIABLE],
  );
  const mainI18n = await createMainI18n(
    store.getLanguage(systemLocale),
    isPseudoActive,
  );
  const service = new PreferencesService({
    store,
    themeController,
    i18n: mainI18n,
    systemLocale,
    isPseudoLocalizationEnabled: isPseudoActive,
  });
  return { service, themeController, i18n: mainI18n };
}
