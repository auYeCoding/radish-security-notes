/**
 * 主题来源的全部取值: 跟随系统, 固定浅色, 固定深色.
 */
export const THEME_SOURCES = ["system", "light", "dark"] as const;

/**
 * 主题来源, 对应 Electron `nativeTheme.themeSource` 的取值.
 */
export type ThemeSource = (typeof THEME_SOURCES)[number];

/**
 * 解析后的明暗主题, 即界面实际使用的外观.
 */
export type ResolvedTheme = "light" | "dark";

/**
 * 首次启动时的主题来源.
 */
export const DEFAULT_THEME_SOURCE: ThemeSource = "system";

/**
 * 判断一个未知值是否是合法的主题来源.
 * @param value 待判断的值.
 * @returns 是合法主题来源时返回 true.
 */
export function isThemeSource(value: unknown): value is ThemeSource {
  return THEME_SOURCES.some((themeSource) => themeSource === value);
}
