import { useTranslation } from "react-i18next";

import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

/**
 * "外观与语言" 分区各行右侧的操作元素, 由装配层提供, 设置 feature 不引用其它 feature.
 */
export interface SettingsAppearanceEntries {
  /**
   * 主题行的操作元素.
   */
  readonly themeAction: React.ReactNode;
  /**
   * 语言行的操作元素.
   */
  readonly languageAction: React.ReactNode;
}

/**
 * 外观与语言分区的属性.
 */
interface SettingsAppearanceSectionProps {
  /**
   * 各行右侧的操作元素.
   */
  readonly entries: SettingsAppearanceEntries;
}

/**
 * 设置对话框的 "外观与语言" 分区: 依次是 "主题" 与 "语言" 两行, 名称与说明是本分区自己的文案,
 * 右侧是装配层提供的分段控件.
 * @param props 组件属性.
 * @returns 外观与语言分区元素.
 */
export function SettingsAppearanceSection(
  props: SettingsAppearanceSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.appearance.title")}>
      <SettingsRow
        name={t("settings.appearance.theme.name")}
        description={t("settings.appearance.theme.description")}
        action={props.entries.themeAction}
      />
      <SettingsRow
        name={t("settings.appearance.language.name")}
        description={t("settings.appearance.language.description")}
        action={props.entries.languageAction}
      />
    </SettingsSection>
  );
}
