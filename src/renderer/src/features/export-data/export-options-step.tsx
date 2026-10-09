import { useTranslation } from "react-i18next";

import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import type { ExportDraft } from "./export-draft";
import { ExportContentOptions } from "./export-content-options";
import { ExportEncryptionFields } from "./export-encryption-fields";
import { ExportFormatChoice } from "./export-format-choice";
import { ExportScopeChoice } from "./export-scope-choice";
import { canGoToConfirm } from "./export-step-rules";
import type { ExportScopeIds } from "./use-export-scope-ids";
import type { ScopeSummaryState } from "./use-scope-summary";

/**
 * 选择格式, 范围, 内容与加密的步骤的属性.
 */
interface ExportOptionsStepProps {
  /**
   * 填写的内容.
   */
  readonly draft: ExportDraft;
  /**
   * 三种范围里的条目.
   */
  readonly scopeIds: ExportScopeIds;
  /**
   * 所选范围的统计状态.
   */
  readonly scopeSummary: ScopeSummaryState;
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<ExportDraft>) => void;
  /**
   * 点 "下一步" 时的回调.
   */
  readonly onNext: () => void;
}

/**
 * 选择格式, 范围, 内容与加密的步骤: 格式, 范围, 内容选项, 口令加密四段, 范围没问题且口令合规时才能
 * 点 "下一步".
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ExportOptionsStep(
  props: ExportOptionsStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <DialogScrollBody className="gap-5">
        <ExportFormatChoice
          value={props.draft.format}
          onChange={(format) => props.onChange({ format })}
        />
        <ExportScopeChoice
          value={props.draft.scopeChoice}
          onChange={(scopeChoice) => props.onChange({ scopeChoice })}
          scopeIds={props.scopeIds}
          summary={props.scopeSummary}
        />
        <ExportContentOptions draft={props.draft} onChange={props.onChange} />
        <ExportEncryptionFields draft={props.draft} onChange={props.onChange} />
      </DialogScrollBody>
      <DialogFooter>
        <Button
          onClick={props.onNext}
          disabled={!canGoToConfirm(props.draft, props.scopeSummary)}
        >
          {t("export.options.next")}
        </Button>
      </DialogFooter>
    </>
  );
}
