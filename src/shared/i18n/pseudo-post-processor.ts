import type { PostProcessorModule } from "i18next";
import { pseudoLocalizeString } from "pseudo-localization";

/**
 * 伪本地化后处理器在 i18next 中的注册名.
 */
export const PSEUDO_POST_PROCESSOR_NAME = "pseudo";

/**
 * 伪本地化后处理器: 在 ICU 格式化之后把最终文案转成带重音且加长的假翻译,
 * 仅开发环境启用, 用来暴露漏走 i18n 的硬编码文案与被文本膨胀撑破的布局.
 */
export const pseudoPostProcessor: PostProcessorModule = {
  type: "postProcessor",
  name: PSEUDO_POST_PROCESSOR_NAME,
  process: (value: string): string => pseudoLocalizeString(value),
};
