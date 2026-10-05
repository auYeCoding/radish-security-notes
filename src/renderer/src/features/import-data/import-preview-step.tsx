import { useTranslation } from "react-i18next";

import type {
  ImportDuplicatePolicy,
  ImportPreview,
} from "@shared/import/import-types";

import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import { ImportDuplicatePolicyField } from "./import-duplicate-policy";
import {
  ImportSummaryList,
  type ImportSummaryRow,
} from "./import-summary-list";
import { ImportTypeCounts } from "./import-type-counts";

/**
 * 预览步骤的属性.
 */
interface ImportPreviewStepProps {
  /**
   * 解析概要.
   */
  readonly preview: ImportPreview;
  /**
   * 选中的重复条目处理方式.
   */
  readonly duplicatePolicy: ImportDuplicatePolicy;
  /**
   * 选中另一种处理方式时的回调.
   */
  readonly onPolicyChange: (policy: ImportDuplicatePolicy) => void;
  /**
   * 点 "确认导入" 时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 点 "重新选择" 时的回调.
   */
  readonly onBack: () => void;
}

/**
 * 把概要变成列表行.
 * @param preview 解析概要.
 * @param translate 取文案的函数.
 * @returns 概要行.
 */
function toSummaryRows(
  preview: ImportPreview,
  translate: (key: SummaryLabelKey) => string,
): readonly ImportSummaryRow[] {
  return [
    {
      label: translate("import.preview.total"),
      value: preview.totalEntryCount,
    },
    {
      label: translate("import.preview.importable"),
      value: preview.importableEntryCount,
    },
    {
      label: translate("import.preview.skipped"),
      value: preview.skippedEntryCount,
    },
    {
      label: translate("import.preview.newFolders"),
      value: preview.newFolderCount,
    },
    { label: translate("import.preview.newTags"), value: preview.newTagCount },
    {
      label: translate("import.preview.duplicates"),
      value: preview.duplicateCount,
    },
    {
      label: translate("import.preview.notImported"),
      value: preview.notImportedCount,
    },
  ];
}

/**
 * 概要行用到的文案键.
 */
type SummaryLabelKey =
  | "import.preview.total"
  | "import.preview.importable"
  | "import.preview.skipped"
  | "import.preview.newFolders"
  | "import.preview.newTags"
  | "import.preview.duplicates"
  | "import.preview.notImported";

/**
 * 预览与确认的步骤: 条目总数, 能导入的条目, 整条跳过的条目, 将新建的文件夹与标签, 重复条目, 将带不进
 * 的内容和类型分布, 有重复条目时给出处理方式的选择. 概要只含个数, 不含任何条目的内容; 点 "确认
 * 导入" 才会写入.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ImportPreviewStep(
  props: ImportPreviewStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { preview } = props;
  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">{t("import.preview.heading")}</p>
        <p className="text-sm text-muted-foreground">
          {t("import.preview.description")}
        </p>
        <ImportSummaryList rows={toSummaryRows(preview, t)} />
        <ImportTypeCounts typeCounts={preview.typeCounts} />
        {preview.notImportedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("import.preview.notImportedHint")}
          </p>
        )}
        {preview.duplicateCount > 0 && (
          <ImportDuplicatePolicyField
            value={props.duplicatePolicy}
            onChange={props.onPolicyChange}
          />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={props.onBack}>
          {t("import.preview.back")}
        </Button>
        <Button onClick={props.onConfirm}>{t("import.preview.confirm")}</Button>
      </DialogFooter>
    </>
  );
}
