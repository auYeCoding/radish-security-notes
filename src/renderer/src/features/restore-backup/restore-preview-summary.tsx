import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { RestorePreview } from "@shared/restore/restore-types";

import { formatByteSize } from "@renderer/components/format-byte-size";
import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";
import { WarningAlert } from "@renderer/components/warning-alert";

import { formatRestoreTime } from "./format-restore-time";

/**
 * 备份概要的属性.
 */
interface RestorePreviewSummaryProps {
  /**
   * 备份概要.
   */
  readonly preview: RestorePreview;
}

/**
 * 把布尔值写成 "包含" 或 "不包含".
 * @param value 是否包含.
 * @param translate 翻译函数.
 * @returns 文案.
 */
function describeIncluded(value: boolean, translate: TFunction): string {
  return translate(
    value ? "restore.values.included" : "restore.values.notIncluded",
  );
}

/**
 * 把备份概要变成列表行.
 * @param preview 备份概要.
 * @param translate 翻译函数.
 * @param language 当前界面语言, 决定时间与大小的写法.
 * @returns 概要行.
 */
function toSummaryRows(
  preview: RestorePreview,
  translate: TFunction,
  language: string,
): readonly SummaryRow[] {
  return [
    {
      label: translate("restore.rows.createdAt"),
      value: formatRestoreTime(preview.createdAt, language),
    },
    { label: translate("restore.rows.entries"), value: preview.entryCount },
    { label: translate("restore.rows.folders"), value: preview.folderCount },
    { label: translate("restore.rows.tags"), value: preview.tagCount },
    {
      label: translate("restore.rows.customTypes"),
      value: preview.customTypeCount,
    },
    {
      label: translate("restore.rows.attachments"),
      value: translate("restore.values.attachments", {
        count: preview.attachmentCount,
        size: formatByteSize(preview.attachmentBytes, translate, language),
      }),
    },
    {
      label: translate("restore.rows.secrets"),
      value: describeIncluded(preview.includesSecrets, translate),
    },
    {
      label: translate("restore.rows.attachmentContent"),
      value: describeIncluded(preview.includesAttachments, translate),
    },
    {
      label: translate("restore.rows.encryption"),
      value: translate(
        preview.isEncrypted
          ? "restore.values.encrypted"
          : "restore.values.plain",
      ),
    },
  ];
}

/**
 * 备份概要: 标题与说明, 备份时间, 各类内容的个数, 是否含保密字段与附件内容, 是否加密, 以及备份
 * 不含保密字段或附件内容时的提示. 只含个数与标志, 不含任何条目的内容.
 * @param props 组件属性.
 * @returns 概要元素.
 */
export function RestorePreviewSummary(
  props: RestorePreviewSummaryProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { preview } = props;
  return (
    <>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{t("restore.preview.heading")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("restore.preview.description", {
            createdAt: formatRestoreTime(preview.createdAt, i18n.language),
          })}
        </p>
      </div>
      <SummaryList rows={toSummaryRows(preview, t, i18n.language)} />
      {!preview.includesSecrets && (
        <WarningAlert
          title={t("restore.preview.noSecrets.title")}
          description={t("restore.preview.noSecrets.description")}
        />
      )}
      {!preview.includesAttachments && (
        <WarningAlert
          title={t("restore.preview.noAttachments.title")}
          description={t("restore.preview.noAttachments.description")}
        />
      )}
    </>
  );
}
