import { useTranslation } from "react-i18next";

import { usePreferencesStore } from "@renderer/stores/use-preferences-store";
import { THEME_SOURCES, isThemeSource } from "@shared/preferences/theme-source";

import { renderThemeIcon } from "./option-visuals";
import { PreferenceSegments } from "./preference-segments";

/**
 * 主题切换控件: 一组紧凑分段, 用图标表示跟随系统, 浅色与深色, 点选后立即保存并生效.
 * @returns 主题分段控件.
 */
export function ThemeSwitcher(): React.JSX.Element {
  const { t } = useTranslation();
  const themeSource = usePreferencesStore((state) => state.themeSource);
  const setThemeSource = usePreferencesStore((state) => state.setThemeSource);
  return (
    <PreferenceSegments
      label={t("preferences.theme.label")}
      options={THEME_SOURCES.map((source) => ({
        value: source,
        label: t(`preferences.theme.${source}`),
        content: renderThemeIcon(source),
      }))}
      value={themeSource}
      isValue={isThemeSource}
      onChange={(next) => void setThemeSource(next)}
    />
  );
}
