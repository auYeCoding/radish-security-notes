import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { DetailCopyRow } from "./detail-copy-row";
import { DetailCustomFieldRow } from "./detail-custom-field-row";
import { DetailPasswordRow } from "./detail-password-row";

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
 * 已选中条目的详情: 标题是名称, 下方依次是账号, 密码, 网址, 自定义字段与备注, 每项带复制
 * 按钮. 复制由主进程写入剪贴板. 调用方用条目编号作 key, 切换条目时密码与隐藏字段的显示状态
 * 随之恢复为遮罩.
 * @param props 组件属性.
 * @returns 详情视图元素.
 */
export function EntryDetailView(
  props: EntryDetailViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const copyField = useEntryStore((state) => state.copyField);
  const { detail } = props;
  return (
    <div className="flex flex-col gap-6 p-8">
      <h2 className="text-xl font-semibold break-words">{detail.name}</h2>
      <dl className="flex max-w-xl flex-col gap-4">
        <DetailCopyRow
          label={t("entryDetail.account")}
          value={detail.account}
          copyLabel={t("entryDetail.copyAccount")}
          onCopy={() => copyField(detail.id, "account")}
        />
        <DetailPasswordRow
          password={detail.password}
          onCopy={() => copyField(detail.id, "password")}
        />
        <DetailCopyRow
          label={t("entryDetail.url")}
          value={detail.url}
          copyLabel={t("entryDetail.copyUrl")}
          onCopy={() => copyField(detail.id, "url")}
        />
        {detail.customFields.map((field) => (
          <DetailCustomFieldRow
            key={field.id}
            entryId={detail.id}
            field={field}
          />
        ))}
        <DetailCopyRow
          label={t("entryDetail.notes")}
          value={detail.notes}
          copyLabel={t("entryDetail.copyNotes")}
          onCopy={() => copyField(detail.id, "notes")}
        />
      </dl>
    </div>
  );
}
