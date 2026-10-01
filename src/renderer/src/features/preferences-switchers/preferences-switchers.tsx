import { useTranslation } from "react-i18next";

import { usePreferencesStore } from "@renderer/stores/use-preferences-store";
import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
} from "@shared/preferences/language";
import { THEME_SOURCES, isThemeSource } from "@shared/preferences/theme-source";

import { languageShortLabel, renderThemeIcon } from "./option-visuals";
import { PreferenceSegments } from "./preference-segments";

/**
 * 主题与语言的切换控件: 两组紧凑分段, 主题用图标, 语言用简称. 作为独立的 feature,
 * 现在放在顶栏右侧, 设置对话框实现后可以直接移进对话框复用.
 * @returns 主题与语言两组分段控件.
 */
export function PreferencesSwitchers(): React.JSX.Element {
  const { t } = useTranslation();
  const themeSource = usePreferencesStore((state) => state.themeSource);
  const language = usePreferencesStore((state) => state.language);
  const setThemeSource = usePreferencesStore((state) => state.setThemeSource);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  return (
    <div className="flex shrink-0 items-center gap-2">
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
      <PreferenceSegments
        label={t("preferences.language.label")}
        options={SUPPORTED_LANGUAGES.map((code) => ({
          value: code,
          label: t(`preferences.language.${code}`),
          content: languageShortLabel(code),
        }))}
        value={language}
        isValue={isSupportedLanguage}
        onChange={(next) => void setLanguage(next)}
      />
    </div>
  );
}
