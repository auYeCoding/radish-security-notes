import { useTranslation } from "react-i18next";

import type { EntryCustomField } from "@shared/entries/custom-field-types";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { DetailCopyRow } from "./detail-copy-row";
import { DetailSecretRow } from "./detail-secret-row";

/**
 * 详情自定义字段行的属性.
 */
interface DetailCustomFieldRowProps {
  /**
   * 字段所在条目的编号.
   */
  readonly entryId: string;
  /**
   * 要展示的自定义字段.
   */
  readonly field: EntryCustomField;
}

/**
 * 详情里的一个自定义字段: 隐藏字段默认遮罩并带显示按钮, 普通字段明文显示, 两者都带复制按钮,
 * 复制由主进程按条目编号与字段编号执行. 调用方用字段编号作 key, 切换条目或字段时遮罩状态随之
 * 恢复.
 * @param props 组件属性.
 * @returns 自定义字段行元素.
 */
export function DetailCustomFieldRow(
  props: DetailCustomFieldRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const copyCustomField = useEntryStore((state) => state.copyCustomField);
  const { field } = props;
  const copyLabel = t("entryDetail.copyCustomField", { label: field.label });
  const handleCopy = (): Promise<boolean> =>
    copyCustomField(props.entryId, field.id);
  if (!field.isHidden) {
    return (
      <DetailCopyRow
        label={field.label}
        value={field.value}
        copyLabel={copyLabel}
        onCopy={handleCopy}
      />
    );
  }
  return (
    <DetailSecretRow
      label={field.label}
      value={field.value}
      copyLabel={copyLabel}
      hiddenText={t("entryDetail.customFieldHidden", { label: field.label })}
      showLabel={t("entryDetail.showCustomField", { label: field.label })}
      hideLabel={t("entryDetail.hideCustomField", { label: field.label })}
      onCopy={handleCopy}
    />
  );
}
