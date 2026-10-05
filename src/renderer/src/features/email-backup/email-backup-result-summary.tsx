import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { EmailBackupSummary } from "@shared/email-backup/email-backup-result";

import { formatByteSize } from "@renderer/components/format-byte-size";
import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";

import { formatBackupTime } from "./format-backup-time";

/**
 * 备份结果摘要的属性.
 */
interface EmailBackupResultSummaryProps {
  /**
   * 发送成功的摘要.
   */
  readonly summary: EmailBackupSummary;
}

/**
 * 结果里列出的摘要: 完成时间, 条目数, 附件个数 (含附件时), 备份大小, 附件与加密情况. 没有邮箱地址,
 * 文件名与任何条目内容.
 * @param summary 发送成功的摘要.
 * @param translate 翻译函数.
 * @param language 当前界面语言.
 * @returns 概要行.
 */
function toSummaryRows(
  summary: EmailBackupSummary,
  translate: TFunction,
  language: string,
): readonly SummaryRow[] {
  return [
    {
      label: translate("emailBackup.result.time"),
      value: formatBackupTime(summary.completedAt, language),
    },
    {
      label: translate("emailBackup.result.entries"),
      value: summary.entryCount,
    },
    {
      label: translate("emailBackup.result.attachments"),
      value: translate(
        summary.includesAttachments
          ? "emailBackup.result.included"
          : "emailBackup.result.excluded",
      ),
    },
    ...(summary.includesAttachments
      ? [
          {
            label: translate("emailBackup.result.attachmentCount"),
            value: summary.attachmentCount,
          },
        ]
      : []),
    {
      label: translate("emailBackup.result.fileSize"),
      value: formatByteSize(summary.fileSizeBytes, translate, language),
    },
    {
      label: translate("emailBackup.result.encryption"),
      value: translate(
        summary.isEncrypted
          ? "emailBackup.result.encrypted"
          : "emailBackup.result.plain",
      ),
    },
  ];
}

/**
 * 备份已发出的结果: 标题, 摘要与提示.
 * @param props 组件属性.
 * @returns 结果元素.
 */
export function EmailBackupResultSummary(
  props: EmailBackupResultSummaryProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t("emailBackup.result.heading")}</h3>
      <SummaryList rows={toSummaryRows(props.summary, t, i18n.language)} />
      <p className="text-sm text-muted-foreground">
        {t("emailBackup.result.notice")}
      </p>
    </div>
  );
}
