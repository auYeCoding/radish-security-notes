import { useTranslation } from "react-i18next";

import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";

/**
 * "标签" 分区的操作元素, 由装配层提供, 设置 feature 不引用其它 feature.
 */
export interface SettingsTagsEntries {
  /**
   * 新建标签行的操作元素.
   */
  readonly createAction: React.ReactNode;
  /**
   * 新建标签行之下的标签列表元素, 含每个标签的编辑与删除操作以及空状态说明.
   */
  readonly tagList: React.ReactNode;
}

/**
 * 标签分区的属性.
 */
interface SettingsTagsSectionProps {
  /**
   * 新建行的操作元素与标签列表元素.
   */
  readonly entries: SettingsTagsEntries;
}

/**
 * 设置对话框的 "标签" 分区: 先是新建标签一行, 其下是标签列表. 标签的新建, 编辑与删除都在这里,
 * 侧栏不再列出标签. 行名称沿用新建入口的按钮文案, 说明是本分区自己的文案.
 * @param props 组件属性.
 * @returns 标签分区元素.
 */
export function SettingsTagsSection(
  props: SettingsTagsSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SettingsSection title={t("settings.tags.title")}>
      <SettingsRow
        name={t("tagCreate.open")}
        description={t("settings.tags.create.description")}
        action={props.entries.createAction}
      />
      {props.entries.tagList}
    </SettingsSection>
  );
}
