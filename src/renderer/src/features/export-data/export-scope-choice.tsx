import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { MAX_EXPORT_ENTRIES } from "@shared/export/export-limits";

import { formatByteSize } from "@renderer/components/format-byte-size";
import { ChoiceOption } from "@renderer/components/choice-option";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { RadioGroup } from "@renderer/components/ui/radio-group";

import {
  EXPORT_SCOPE_CHOICES,
  isExportScopeChoice,
  type ExportScopeChoice,
} from "./export-draft";
import { findScopeProblem, type ScopeProblem } from "./export-step-rules";
import type { ExportScopeIds } from "./use-export-scope-ids";
import type { ScopeSummaryState } from "./use-scope-summary";

/**
 * 选择导出范围的属性.
 */
interface ExportScopeChoiceProps {
  /**
   * 选中的范围.
   */
  readonly value: ExportScopeChoice;
  /**
   * 选中另一个范围时的回调.
   */
  readonly onChange: (choice: ExportScopeChoice) => void;
  /**
   * 三种范围里的条目.
   */
  readonly scopeIds: ExportScopeIds;
  /**
   * 所选范围的统计状态.
   */
  readonly summary: ScopeSummaryState;
}

/**
 * 每种范围选项的条目个数.
 * @param choice 范围选项.
 * @param scopeIds 三种范围里的条目.
 * @returns 条目个数.
 */
function countOf(choice: ExportScopeChoice, scopeIds: ExportScopeIds): number {
  switch (choice) {
    case "current":
      return scopeIds.currentIds.length;
    case "checked":
      return scopeIds.checkedIds.length;
    default:
      return scopeIds.allCount;
  }
}

/**
 * 范围问题对应的提示文案.
 * @param problem 范围问题.
 * @param translate 翻译函数.
 * @returns 提示文案.
 */
function describeScopeProblem(
  problem: ScopeProblem,
  translate: TFunction,
): string {
  switch (problem) {
    case "loading":
      return translate("export.options.scope.loading");
    case "failed":
      return translate("export.options.scope.loadFailed");
    case "empty":
      return translate("export.options.scope.empty");
    default:
      return translate("export.options.scope.tooMany", {
        limit: MAX_EXPORT_ENTRIES,
      });
  }
}

/**
 * 统计摘要的属性.
 */
interface ScopeSummaryLineProps {
  /**
   * 所选范围的统计状态.
   */
  readonly summary: ScopeSummaryState;
}

/**
 * 所选范围的统计摘要: 条目数, 附件个数与大小; 统计中, 失败, 为空或超限时给出对应的提示.
 * @param props 组件属性.
 * @returns 摘要元素.
 */
function ScopeSummaryLine(props: ScopeSummaryLineProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const problem = findScopeProblem(props.summary);
  if (problem !== undefined) {
    return problem === "loading" ? (
      <p className="text-sm text-muted-foreground" role="status">
        {describeScopeProblem(problem, t)}
      </p>
    ) : (
      <Alert variant="destructive">
        <AlertDescription>{describeScopeProblem(problem, t)}</AlertDescription>
      </Alert>
    );
  }
  if (props.summary.status !== "ready") {
    return <></>;
  }
  const { summary } = props.summary;
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {t("export.options.scope.summary", { entries: summary.entryCount })}
      {summary.attachmentCount > 0 &&
        ` ${t("export.options.scope.attachmentsSummary", {
          count: summary.attachmentCount,
          size: formatByteSize(summary.attachmentBytes, t, i18n.language),
        })}`}
    </p>
  );
}

/**
 * 选择导出范围: 全部条目, 当前列表, 已勾选的条目三张单选卡片, 各写明条目个数, 没有条目的范围不可选;
 * 下面是所选范围的统计摘要. "某个文件夹或标签" 的做法是先在侧栏选中它再选当前列表.
 * @param props 组件属性.
 * @returns 范围选择元素.
 */
export function ExportScopeChoice(
  props: ExportScopeChoiceProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const handleChange = (value: unknown): void => {
    if (isExportScopeChoice(value)) {
      props.onChange(value);
    }
  };
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("export.options.scope.heading")}
      </h3>
      <RadioGroup
        aria-label={t("export.options.scope.heading")}
        value={props.value}
        onValueChange={handleChange}
      >
        {EXPORT_SCOPE_CHOICES.map((choice) => {
          const count = countOf(choice, props.scopeIds);
          return (
            <ChoiceOption
              key={choice}
              id={`export-scope-${choice}`}
              value={choice}
              title={t(`export.options.scope.${choice}`)}
              description={[
                choice === "all"
                  ? undefined
                  : t(`export.options.scope.${choice}Hint`),
                t("export.options.scope.count", { count }),
              ]
                .filter((part) => part !== undefined)
                .join(" ")}
              isDisabled={count === 0}
            />
          );
        })}
      </RadioGroup>
      <ScopeSummaryLine summary={props.summary} />
    </section>
  );
}
