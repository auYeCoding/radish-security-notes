import i18next from "i18next";
import type { i18n } from "i18next";
import ICU from "i18next-icu";

import {
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../preferences/language";
import { DEFAULT_NAMESPACE, I18N_RESOURCES } from "./i18n-resources";
import {
  PSEUDO_POST_PROCESSOR_NAME,
  pseudoPostProcessor,
} from "./pseudo-post-processor";

/**
 * 创建 i18next 实例的选项.
 */
export interface CreateI18nInstanceOptions {
  /**
   * 初始界面语言.
   */
  readonly language: SupportedLanguage;
  /**
   * 是否启用开发用的伪本地化.
   */
  readonly isPseudoLocalizationEnabled: boolean;
}

/**
 * 创建并初始化一个 i18next 实例, 主进程与渲染进程各调用一次, 得到互相独立的实例.
 * 实例使用 ICU 消息格式与共享的语言资源.
 * @param options 创建选项.
 * @returns 初始化完成的 i18next 实例.
 */
export async function createI18nInstance(
  options: CreateI18nInstanceOptions,
): Promise<i18n> {
  const instance = i18next.createInstance();
  instance.use(ICU);
  instance.use(pseudoPostProcessor);
  await instance.init({
    lng: options.language,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    resources: I18N_RESOURCES,
    defaultNS: DEFAULT_NAMESPACE,
    interpolation: { escapeValue: false },
    postProcess: options.isPseudoLocalizationEnabled
      ? [PSEUDO_POST_PROCESSOR_NAME]
      : false,
  });
  return instance;
}
