import { useTranslation } from "react-i18next";

import { usePreferencesStore } from "@renderer/stores/use-preferences-store";
import {
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
} from "@shared/preferences/language";

import { languageShortLabel } from "./option-visuals";
import { PreferenceSegments } from "./preference-segments";

/**
 * 语言切换控件: 一组紧凑分段, 用语言简称表示各界面语言, 点选后立即保存并切换界面语言.
 * @returns 语言分段控件.
 */
export function LanguageSwitcher(): React.JSX.Element {
  const { t } = useTranslation();
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  return (
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
  );
}
