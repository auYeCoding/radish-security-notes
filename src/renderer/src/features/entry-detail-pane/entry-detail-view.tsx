import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { NOTES_FIELD_KEY, type EntryDetail } from "@shared/entries/entry-types";

import { entryFieldName } from "@renderer/components/entry-type-naming";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useEntryTypeCatalog } from "@renderer/stores/use-entry-type-catalog";

import { DetailCustomFieldRow } from "./detail-custom-field-row";
import { DetailNotesRow } from "./detail-notes-row";
import { DetailTotpCodeRow } from "./detail-totp-code-row";
import { DetailTotpSecretRow } from "./detail-totp-secret-row";
import { DetailValueRow } from "./detail-value-row";
import { EntryDetailHeader } from "./entry-detail-header";

/**
 * 条目详情视图的属性.
 */
interface EntryDetailViewProps {
  /**
   * 要展示的条目详情.
   */
  readonly detail: EntryDetail;
  /**
   * 标题行右侧的操作, 例如编辑与删除按钮.
   */
  readonly actions?: ReactNode;
  /**
   * 备注之后的附件区, 由调用方给出, 例如条目的附件列表.
   */
  readonly attachments?: ReactNode;
}

/**
 * 已选中条目的详情: 标题上方标明类型, 标题是名称, 标题行右侧是调用方给出的操作, 下方依次是该
 * 类型的字段, 带 TOTP 时的验证码与 TOTP 密钥, 自定义字段与备注 (按备注格式呈现), 最后是调用方给出的附件区, 敏感
 * 字段默认遮罩, 每项带复制按钮. 复制由主进程写入剪贴板. 条目的类型 (预设或自定义) 经类型目录取得,
 * 目录里没有这个类型时不渲染. 调用方用条目编号与编辑次数作 key, 切换条目或保存编辑后遮罩字段
 * 的显示状态随之恢复为遮罩, 验证码与已显示的密钥随组件卸载而丢弃.
 * @param props 组件属性.
 * @returns 详情视图元素, 条目的类型不在目录里时为 null.
 */
export function EntryDetailView(
  props: EntryDetailViewProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const copyField = useEntryStore((state) => state.copyField);
  const catalog = useEntryTypeCatalog();
  const { detail } = props;
  const type = catalog.find(detail.type);
  if (type === undefined) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6 p-8">
      <EntryDetailHeader detail={detail} type={type} actions={props.actions} />
      <dl className="flex max-w-xl flex-col gap-4">
        {type.fields.map((field) => (
          <DetailValueRow
            key={field.key}
            label={entryFieldName(field, t)}
            value={detail.fields[field.key] ?? ""}
            isSensitive={field.isSensitive}
            onCopy={() => copyField(detail.id, field.key)}
          />
        ))}
        {detail.hasTotp ? (
          <>
            <DetailTotpCodeRow entryId={detail.id} />
            <DetailTotpSecretRow entryId={detail.id} />
          </>
        ) : null}
        {detail.customFields.map((field) => (
          <DetailCustomFieldRow
            key={field.id}
            entryId={detail.id}
            field={field}
          />
        ))}
        <DetailNotesRow
          notes={detail.notes}
          format={detail.notesFormat}
          onCopy={() => copyField(detail.id, NOTES_FIELD_KEY)}
        />
      </dl>
      {props.attachments}
    </div>
  );
}
