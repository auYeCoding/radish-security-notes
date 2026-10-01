import type { DEFAULT_NAMESPACE } from "./i18n-resources";
import type zh from "../locales/zh.json";

declare module "i18next" {
  /**
   * 为 i18next 提供强类型的翻译键, 以中文资源的结构为准.
   */
  interface CustomTypeOptions {
    /**
     * 默认命名空间.
     */
    defaultNS: typeof DEFAULT_NAMESPACE;
    /**
     * 资源结构, 翻译键从这里推导.
     */
    resources: {
      /**
       * 默认命名空间下的翻译资源.
       */
      translation: typeof zh;
    };
  }
}
