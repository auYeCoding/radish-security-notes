import { useTranslation } from "react-i18next";

import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

/**
 * "安全" 分区各行右侧的操作元素, 由装配层提供, 设置 feature 不引用其它 feature.
 */
export interface SettingsSecurityEntries {
  /**
   * 主密码行的操作元素.
   */
  readonly masterPasswordAction: React.ReactNode;
}

/**
 * 安全分区的属性.
 */
interface SettingsSecuritySectionProps {
  /**
   * 各行右侧的操作元素.
   */
  readonly entries: SettingsSecurityEntries;
}

/**
 * 设置对话框的 "安全" 分区: 目前只有 "主密码" 一行, 名称与说明是本分区自己的文案, 右侧是装配层
 * 提供的开关.
 * @param props 组件属性.
 * @returns 安全分区元素.
 */
export function SettingsSecuritySection(
  props: SettingsSecuritySectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.security.title")}>
      <SettingsRow
        name={t("settings.security.masterPassword.name")}
        description={t("settings.security.masterPassword.description")}
        action={props.entries.masterPasswordAction}
      />
    </SettingsSection>
  );
}
