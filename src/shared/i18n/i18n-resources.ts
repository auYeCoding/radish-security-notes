import en from "../locales/en.json";
import zh from "../locales/zh.json";

/**
 * 全部语言共用的默认命名空间.
 */
export const DEFAULT_NAMESPACE = "translation";

/**
 * 全部语言资源, 主进程与渲染进程的 i18next 实例都从这里取, 保证文案单一数据源.
 */
export const I18N_RESOURCES = {
  zh: { [DEFAULT_NAMESPACE]: zh },
  en: { [DEFAULT_NAMESPACE]: en },
} as const;
