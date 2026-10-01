/**
 * 界面语言的全部取值: 简体中文与英文.
 */
export const SUPPORTED_LANGUAGES = ["zh", "en"] as const;

/**
 * 界面语言.
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * 界面语言对应的 BCP 47 语言标签, 写入 html 的 lang 属性. 浏览器据此选择字体与
 * 字形: 简体中文必须带 Hans 文字标注, 否则只写 zh 时由系统区域决定用简体还是繁体字形.
 */
export const LANGUAGE_TAGS: Readonly<Record<SupportedLanguage, string>> = {
  zh: "zh-Hans",
  en: "en",
};

/**
 * 系统语言不在支持范围内时使用的语言.
 */
export const FALLBACK_LANGUAGE: SupportedLanguage = "en";

/**
 * 系统语言代码以此开头时, 视为中文.
 */
const CHINESE_LOCALE_PREFIX = "zh";

/**
 * 判断一个未知值是否是合法的界面语言.
 * @param value 待判断的值.
 * @returns 是合法界面语言时返回 true.
 */
export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

/**
 * 把系统语言代码换算成界面语言: 以 zh 开头的取中文, 其余取英文.
 * @param locale 系统语言代码, 例如 zh-CN, en-US.
 * @returns 对应的界面语言.
 */
export function resolveLanguageFromLocale(locale: string): SupportedLanguage {
  return locale.toLowerCase().startsWith(CHINESE_LOCALE_PREFIX)
    ? "zh"
    : FALLBACK_LANGUAGE;
}
