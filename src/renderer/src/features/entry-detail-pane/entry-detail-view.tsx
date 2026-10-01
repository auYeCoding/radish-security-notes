import { useTranslation } from "react-i18next";

import { NOTES_FIELD_KEY, type EntryDetail } from "@shared/entries/entry-types";
import { requireEntryType } from "@shared/entries/preset-entry-types";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { DetailCustomFieldRow } from "./detail-custom-field-row";
import { DetailTypeLabel } from "./detail-type-label";
import { DetailValueRow } from "./detail-value-row";

/**
 * 条目详情视图的属性.
 */
interface EntryDetailViewProps {
  /**
   * 要展示的条目详情.
   */
  readonly detail: EntryDetail;
}

/**
 * 已选中条目的详情: 标题上方标明类型, 标题是名称, 下方依次是该类型的字段, 自定义字段与备注,
 * 敏感字段默认遮罩, 每项带复制按钮. 复制由主进程写入剪贴板. 调用方用条目编号作 key, 切换
 * 条目时遮罩字段的显示状态随之恢复为遮罩.
 * @param props 组件属性.
 * @returns 详情视图元素.
 */
export function EntryDetailView(
  props: EntryDetailViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const copyField = useEntryStore((state) => state.copyField);
  const { detail } = props;
  const type = requireEntryType(detail.type);
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <DetailTypeLabel typeKey={type.key} />
        <h2 className="text-xl font-semibold break-words">{detail.name}</h2>
      </div>
      <dl className="flex max-w-xl flex-col gap-4">
        {type.fields.map((field) => (
          <DetailValueRow
            key={field.key}
            label={t(`entryFields.${field.key}`)}
            value={detail.fields[field.key] ?? ""}
            isSensitive={field.isSensitive}
            onCopy={() => copyField(detail.id, field.key)}
          />
        ))}
        {detail.customFields.map((field) => (
          <DetailCustomFieldRow
            key={field.id}
            entryId={detail.id}
            field={field}
          />
        ))}
        <DetailValueRow
          label={t("entryDetail.notes")}
          value={detail.notes}
          isSensitive={false}
          onCopy={() => copyField(detail.id, NOTES_FIELD_KEY)}
        />
      </dl>
    </div>
  );
}
