import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import type { SupportedLanguage } from "@shared/preferences/language";
import type { i18n } from "i18next";

/**
 * 开发时开启伪本地化的环境变量名.
 */
export const PSEUDO_LOCALIZATION_ENVIRONMENT_VARIABLE = "RADISH_PSEUDO_LOCALE";

/**
 * 环境变量取此值时开启伪本地化.
 */
const PSEUDO_LOCALIZATION_ENABLED_VALUE = "1";

/**
 * 判断是否启用伪本地化: 只在开发环境且环境变量开启时启用.
 * @param isDevelopment 是否开发环境.
 * @param environmentValue 环境变量的取值.
 * @returns 启用时返回 true.
 */
export function isPseudoLocalizationEnabled(
  isDevelopment: boolean,
  environmentValue: string | undefined,
): boolean {
  return (
    isDevelopment && environmentValue === PSEUDO_LOCALIZATION_ENABLED_VALUE
  );
}

/**
 * 创建主进程自己的 i18next 实例, 用于窗口标题等主进程文案.
 * @param language 初始界面语言.
 * @param isPseudoLocalizationActive 是否启用伪本地化.
 * @returns 初始化完成的主进程 i18next 实例.
 */
export function createMainI18n(
  language: SupportedLanguage,
  isPseudoLocalizationActive: boolean,
): Promise<i18n> {
  return createI18nInstance({
    language,
    isPseudoLocalizationEnabled: isPseudoLocalizationActive,
  });
}
