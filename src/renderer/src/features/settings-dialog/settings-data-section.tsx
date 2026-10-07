import { useTranslation } from "react-i18next";

import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

/**
 * "数据" 分区四行右侧的操作元素, 由装配层提供, 设置 feature 不引用其它 feature.
 */
export interface SettingsDataEntries {
  /**
   * 导入数据行的操作元素.
   */
  readonly importAction: React.ReactNode;
  /**
   * 导出数据行的操作元素.
   */
  readonly exportAction: React.ReactNode;
  /**
   * 邮箱备份行的操作元素.
   */
  readonly emailBackupAction: React.ReactNode;
  /**
   * 从备份恢复行的操作元素.
   */
  readonly restoreAction: React.ReactNode;
}

/**
 * 数据分区的属性.
 */
interface SettingsDataSectionProps {
  /**
   * 四行右侧的操作元素.
   */
  readonly entries: SettingsDataEntries;
}

/**
 * 设置对话框的 "数据" 分区: 依次是导入数据, 导出数据, 邮箱备份, 从备份恢复四行. 行名称沿用各入口
 * 的按钮文案, 说明是本分区自己的文案.
 * @param props 组件属性.
 * @returns 数据分区元素.
 */
export function SettingsDataSection(
  props: SettingsDataSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.data.title")}>
      <SettingsRow
        name={t("import.trigger.label")}
        description={t("settings.data.import.description")}
        action={props.entries.importAction}
      />
      <SettingsRow
        name={t("export.trigger.label")}
        description={t("settings.data.export.description")}
        action={props.entries.exportAction}
      />
      <SettingsRow
        name={t("emailBackup.trigger.label")}
        description={t("settings.data.emailBackup.description")}
        action={props.entries.emailBackupAction}
      />
      <SettingsRow
        name={t("restore.trigger.label")}
        description={t("settings.data.restore.description")}
        action={props.entries.restoreAction}
      />
    </SettingsSection>
  );
}
