import { FolderOpenIcon } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { ExportSummary } from "@shared/export/export-types";

import { formatByteSize } from "@renderer/components/format-byte-size";
import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";
import { WarningAlert } from "@renderer/components/warning-alert";

import { ExportFailureAlert } from "./export-failure-alert";
import type { ResultNotice } from "./export-flow-state";
import { ExportLossList } from "./export-loss-list";

/**
 * 结果步骤的属性.
 */
interface ExportResultStepProps {
  /**
   * 导出摘要.
   */
  readonly summary: ExportSummary;
  /**
   * 打开所在文件夹失败的提示, 没有时为 undefined.
   */
  readonly notice: ResultNotice | undefined;
  /**
   * 点 "打开所在文件夹" 时的回调.
   */
  readonly onRevealFile: () => void;
  /**
   * 点 "完成" 时的回调.
   */
  readonly onDone: () => void;
}

/**
 * 结果页里列出的摘要: 格式, 条目数, 附件数 (含附件时), 文件大小, 保密字段与加密情况.
 * @param summary 导出摘要.
 * @param translate 翻译函数.
 * @param language 当前界面语言.
 * @returns 概要行.
 */
function toSummaryRows(
  summary: ExportSummary,
  translate: TFunction,
  language: string,
): readonly SummaryRow[] {
  const yesNo = (value: boolean): string =>
    translate(value ? "export.summary.yes" : "export.summary.no");
  return [
    {
      label: translate("export.summary.format"),
      value: translate(`export.options.format.${summary.format}.label`),
    },
    { label: translate("export.summary.entries"), value: summary.entryCount },
    ...(summary.includesAttachments
      ? [
          {
            label: translate("export.summary.attachmentCount"),
            value: summary.attachmentCount,
          },
        ]
      : []),
    {
      label: translate("export.summary.fileSize"),
      value: formatByteSize(summary.fileSizeBytes, translate, language),
    },
    {
      label: translate("export.summary.secrets"),
      value: yesNo(summary.includesSecrets),
    },
    {
      label: translate("export.summary.encryption"),
      value: translate(
        summary.isEncrypted
          ? "export.summary.encrypted"
          : "export.summary.plain",
      ),
    },
  ];
}

/**
 * 结果页: 导出摘要, 这种格式没能带出内容的汇总, 明文文件显著提示妥善保管并及时删除, 加密文件提示记住
 * 口令, "打开所在文件夹" 按钮与它失败时的提示, "完成" 按钮. 页面上没有文件路径与任何条目内容.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ExportResultStep(
  props: ExportResultStepProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { summary } = props;
  const reminder = summary.isEncrypted
    ? "encryptedReminder"
    : "plaintextReminder";
  return (
    <>
      <DialogScrollBody className="gap-4">
        <h3 className="text-sm font-medium">{t("export.result.heading")}</h3>
        <SummaryList rows={toSummaryRows(summary, t, i18n.language)} />
        <ExportLossList losses={summary.losses} />
        <WarningAlert
          title={t(`export.result.${reminder}.title`)}
          description={t(`export.result.${reminder}.description`)}
        />
        <ExportFailureAlert failure={props.notice?.failure} />
      </DialogScrollBody>
      <DialogFooter>
        <Button variant="outline" onClick={props.onRevealFile}>
          <FolderOpenIcon aria-hidden="true" data-icon="inline-start" />
          {t("export.result.revealFile")}
        </Button>
        <Button onClick={props.onDone}>{t("export.result.done")}</Button>
      </DialogFooter>
    </>
  );
}
