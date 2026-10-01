import type { EntryCustomField } from "@shared/entries/custom-field-types";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { DetailValueRow } from "./detail-value-row";

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
 * 详情里的一个自定义字段: 隐藏字段按敏感字段展示, 复制由主进程按条目编号与字段编号执行.
 * 调用方用字段编号作 key, 切换条目或字段时遮罩状态随之恢复.
 * @param props 组件属性.
 * @returns 自定义字段行元素.
 */
export function DetailCustomFieldRow(
  props: DetailCustomFieldRowProps,
): React.JSX.Element {
  const copyCustomField = useEntryStore((state) => state.copyCustomField);
  const { field } = props;
  return (
    <DetailValueRow
      label={field.label}
      value={field.value}
      isSensitive={field.isHidden}
      onCopy={() => copyCustomField(props.entryId, field.id)}
    />
  );
}
