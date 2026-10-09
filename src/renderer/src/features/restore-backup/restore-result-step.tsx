import { useTranslation } from "react-i18next";

import type { RestoreOutcome } from "@shared/restore/restore-types";

import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import { RestoreNotIncludedNotice } from "./restore-not-included-notice";

/**
 * 结果步骤的属性.
 */
interface RestoreResultStepProps {
  /**
   * 恢复概况.
   */
  readonly outcome: RestoreOutcome;
  /**
   * 点 "完成" 时的回调.
   */
  readonly onDone: () => void;
}

/**
 * 概要行用到的文案键.
 */
type OutcomeLabelKey =
  | "restore.rows.entries"
  | "restore.rows.folders"
  | "restore.rows.tags"
  | "restore.rows.customTypes"
  | "restore.rows.attachments";

/**
 * 把恢复概况变成列表行.
 * @param outcome 恢复概况.
 * @param translate 取文案的函数.
 * @returns 概况行.
 */
function toSummaryRows(
  outcome: RestoreOutcome,
  translate: (key: OutcomeLabelKey) => string,
): readonly SummaryRow[] {
  return [
    { label: translate("restore.rows.entries"), value: outcome.entryCount },
    { label: translate("restore.rows.folders"), value: outcome.folderCount },
    { label: translate("restore.rows.tags"), value: outcome.tagCount },
    {
      label: translate("restore.rows.customTypes"),
      value: outcome.customTypeCount,
    },
    {
      label: translate("restore.rows.attachments"),
      value: outcome.attachmentCount,
    },
  ];
}

/**
 * 恢复结果的步骤: 恢复出来的各类内容的个数, 清空并替换了原有数据时的说明, 不在备份里的内容的
 * 提示和 "完成" 按钮.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function RestoreResultStep(
  props: RestoreResultStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <DialogScrollBody className="gap-4">
        <p className="text-sm font-medium">{t("restore.result.heading")}</p>
        <SummaryList rows={toSummaryRows(props.outcome, t)} />
        {props.outcome.replacedExistingData && (
          <p className="text-sm text-muted-foreground">
            {t("restore.result.replaced")}
          </p>
        )}
        <RestoreNotIncludedNotice />
      </DialogScrollBody>
      <DialogFooter>
        <Button onClick={props.onDone}>{t("restore.result.close")}</Button>
      </DialogFooter>
    </>
  );
}
