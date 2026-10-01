import type { SupportedLanguage } from "@shared/preferences/language";
import type { ThemeSource } from "@shared/preferences/theme-source";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

/**
 * 每种语言按钮上显示的简称. 简称是语言的自称, 不随界面语言变化.
 */
const LANGUAGE_SHORT_LABELS: Readonly<Record<SupportedLanguage, string>> = {
  zh: "中",
  en: "EN",
};

/**
 * 返回主题来源按钮上显示的图标: 跟随系统是显示器, 浅色是太阳, 深色是月亮.
 * @param themeSource 主题来源.
 * @returns 图标元素.
 */
export function renderThemeIcon(themeSource: ThemeSource): React.JSX.Element {
  switch (themeSource) {
    case "system":
      return <MonitorIcon aria-hidden="true" />;
    case "light":
      return <SunIcon aria-hidden="true" />;
    case "dark":
      return <MoonIcon aria-hidden="true" />;
  }
}

/**
 * 返回语言按钮上显示的简称.
 * @param language 界面语言.
 * @returns 简称文字.
 */
export function languageShortLabel(language: SupportedLanguage): string {
  return LANGUAGE_SHORT_LABELS[language];
}
