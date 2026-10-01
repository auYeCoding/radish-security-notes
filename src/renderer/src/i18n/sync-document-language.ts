import {
  LANGUAGE_TAGS,
  isSupportedLanguage,
} from "@shared/preferences/language";
import type { i18n } from "i18next";

/**
 * 被同步语言与方向的文档根元素所需的最小接口.
 */
export type DocumentLanguageTarget = Pick<HTMLElement, "lang" | "dir">;

/**
 * 语言来源所需的 i18next 最小接口: 当前语言, 方向判断与事件订阅.
 */
export type LanguageSource = Pick<i18n, "language" | "dir" | "on" | "off">;

/**
 * 把 i18next 的语言代码换算成写入 lang 属性的语言标签. 不在支持范围内的代码原样返回.
 * @param language i18next 的语言代码.
 * @returns 对应的 BCP 47 语言标签.
 */
function resolveLanguageTag(language: string): string {
  return isSupportedLanguage(language) ? LANGUAGE_TAGS[language] : language;
}

/**
 * 让文档根元素的 lang 与 dir 跟随界面语言: 立即同步一次, 之后随语言切换更新.
 * lang 决定浏览器的字体与字形选择和读屏软件的发音语言, dir 决定文字方向.
 * @param root 要设置属性的根元素, 通常是 html.
 * @param source 提供当前语言与切换事件的 i18next 实例.
 * @returns 取消同步的函数.
 */
export function syncDocumentLanguage(
  root: DocumentLanguageTarget,
  source: LanguageSource,
): () => void {
  const applyLanguage = (language: string): void => {
    root.lang = resolveLanguageTag(language);
    root.dir = source.dir(language);
  };
  applyLanguage(source.language);
  source.on("languageChanged", applyLanguage);
  return () => source.off("languageChanged", applyLanguage);
}
