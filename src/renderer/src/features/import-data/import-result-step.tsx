import { FolderOpenIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ImportOutcome } from "@shared/import/import-types";

import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";
import { WarningAlert } from "@renderer/components/warning-alert";

import type { ResultNotice } from "./import-flow-state";
import { describeImportFailure } from "./describe-import-failure";
import { NotImportedList } from "./not-imported-list";

/**
 * 结果步骤的属性.
 */
interface ImportResultStepProps {
  /**
   * 导入概况与未能带入清单.
   */
  readonly outcome: ImportOutcome;
  /**
   * 保存清单或打开所在文件夹之后的提示, 没有时为 undefined.
   */
  readonly notice: ResultNotice | undefined;
  /**
   * 点 "保存为文本文件" 时的回调.
   */
  readonly onSaveReport: () => void;
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
 * 概要行用到的文案键.
 */
type OutcomeLabelKey =
  | "import.result.imported"
  | "import.result.skippedDuplicates"
  | "import.result.skippedEntries"
  | "import.result.createdFolders"
  | "import.result.createdTags";

/**
 * 把导入概况变成列表行.
 * @param outcome 导入概况.
 * @param translate 取文案的函数.
 * @returns 概况行.
 */
function toSummaryRows(
  outcome: ImportOutcome,
  translate: (key: OutcomeLabelKey) => string,
): readonly SummaryRow[] {
  return [
    {
      label: translate("import.result.imported"),
      value: outcome.importedCount,
    },
    {
      label: translate("import.result.skippedDuplicates"),
      value: outcome.skippedDuplicateCount,
    },
    {
      label: translate("import.result.skippedEntries"),
      value: outcome.skippedEntryCount,
    },
    {
      label: translate("import.result.createdFolders"),
      value: outcome.createdFolderCount,
    },
    {
      label: translate("import.result.createdTags"),
      value: outcome.createdTagCount,
    },
  ];
}

/**
 * 结果页提示的属性.
 */
interface ResultNoticeViewProps {
  /**
   * 要显示的提示, 没有时不渲染.
   */
  readonly notice: ResultNotice | undefined;
}

/**
 * 保存清单或打开所在文件夹之后的提示: 保存成功是一行说明, 失败是失败提示条.
 * @param props 组件属性.
 * @returns 提示元素, 没有提示时为空.
 */
function ResultNoticeView(
  props: ResultNoticeViewProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const { notice } = props;
  if (notice === undefined) {
    return null;
  }
  if (notice.kind === "saved") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("import.result.notImported.saved")}
      </p>
    );
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {describeImportFailure(notice.failure, t)}
      </AlertDescription>
    </Alert>
  );
}

/**
 * 导入结果的步骤: 导入概况, 删除明文导出文件的显著提示 (带 "打开所在文件夹" 按钮), 未能带入内容的
 * 清单 (带 "保存为文本文件" 按钮). 清单里没有任何保密值.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ImportResultStep(
  props: ImportResultStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">{t("import.result.heading")}</p>
        <SummaryList rows={toSummaryRows(props.outcome, t)} />
        <WarningAlert
          title={t("import.result.deleteWarning.title")}
          description={t("import.result.deleteWarning.description")}
        />
        <div>
          <Button variant="outline" size="sm" onClick={props.onRevealFile}>
            <FolderOpenIcon aria-hidden="true" data-icon="inline-start" />
            {t("import.result.revealFile")}
          </Button>
        </div>
        <NotImportedList items={props.outcome.notImported} />
        <ResultNoticeView notice={props.notice} />
      </div>
      <DialogFooter>
        {props.outcome.notImported.length > 0 && (
          <Button variant="outline" onClick={props.onSaveReport}>
            {t("import.result.notImported.save")}
          </Button>
        )}
        <Button onClick={props.onDone}>{t("import.result.done")}</Button>
      </DialogFooter>
    </>
  );
}
