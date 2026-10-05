import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";
import {
  SummaryList,
  type SummaryRow,
} from "@renderer/components/summary-list";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import { willIncludeAttachments } from "./export-draft";
import { ExportFailureAlert } from "./export-failure-alert";
import type { ConfirmStepState } from "./export-flow-state";
import { ExportRiskNotice } from "./export-risk-notice";
import { canStartExport } from "./export-step-rules";
import type { ScopeSummaryState } from "./use-scope-summary";

/**
 * 确认步骤的属性.
 */
interface ExportConfirmStepProps {
  /**
   * 确认步骤的状态.
   */
  readonly state: ConfirmStepState;
  /**
   * 所选范围的统计状态, 带着条目数与是否设了主密码.
   */
  readonly scopeSummary: ScopeSummaryState;
  /**
   * 勾选或取消勾选 "我了解导出文件是明文" 的回调.
   */
  readonly onAcknowledgedChange: (hasAcknowledged: boolean) => void;
  /**
   * 改动主密码的回调.
   */
  readonly onMasterPasswordChange: (masterPassword: string) => void;
  /**
   * 点 "返回修改" 时的回调.
   */
  readonly onBack: () => void;
  /**
   * 点 "导出" 时的回调.
   */
  readonly onExport: () => void;
}

/**
 * 确认步骤里列出的各项选择.
 * @param state 确认步骤的状态.
 * @param entryCount 所选范围的条目数.
 * @param translate 翻译函数.
 * @returns 概要行.
 */
function toSummaryRows(
  state: ConfirmStepState,
  entryCount: number,
  translate: TFunction,
): readonly SummaryRow[] {
  const { draft } = state;
  const yesNo = (value: boolean): string =>
    translate(value ? "export.summary.yes" : "export.summary.no");
  const scopeName = translate(`export.options.scope.${draft.scopeChoice}`);
  const count = translate("export.options.scope.count", { count: entryCount });
  return [
    {
      label: translate("export.summary.format"),
      value: translate(`export.options.format.${draft.format}.label`),
    },
    {
      label: translate("export.summary.scope"),
      value: `${scopeName} (${count})`,
    },
    {
      label: translate("export.summary.secrets"),
      value: yesNo(draft.includeSecrets),
    },
    {
      label: translate("export.summary.attachments"),
      value: yesNo(willIncludeAttachments(draft)),
    },
    {
      label: translate("export.summary.encryption"),
      value: translate(
        draft.isEncrypted ? "export.summary.encrypted" : "export.summary.plain",
      ),
    },
  ];
}

/**
 * 确认步骤: 各项选择的概要, 风险提示与确认, 设了主密码时重新输入主密码, 上一次失败的原因. 不满足条件时
 * "导出" 按钮不可点.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ExportConfirmStep(
  props: ExportConfirmStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { state, scopeSummary } = props;
  const isReady = scopeSummary.status === "ready";
  const hasMasterPassword = isReady && scopeSummary.summary.hasMasterPassword;
  const entryCount = isReady ? scopeSummary.summary.entryCount : 0;
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">{t("export.confirm.heading")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("export.confirm.description")}
          </p>
        </div>
        <SummaryList rows={toSummaryRows(state, entryCount, t)} />
        <ExportRiskNotice
          isEncrypted={state.draft.isEncrypted}
          hasAcknowledged={state.hasAcknowledged}
          onAcknowledgedChange={props.onAcknowledgedChange}
        />
        {hasMasterPassword && (
          <PasswordField
            label={t("export.confirm.masterPassword.label")}
            description={t("export.confirm.masterPassword.hint")}
            autoComplete="current-password"
            value={state.masterPassword}
            onChange={(event) =>
              props.onMasterPasswordChange(event.target.value)
            }
          />
        )}
        <ExportFailureAlert failure={state.failure} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={props.onBack}>
          {t("export.confirm.back")}
        </Button>
        <Button
          onClick={props.onExport}
          disabled={!canStartExport(state, hasMasterPassword)}
        >
          {t("export.confirm.submit")}
        </Button>
      </DialogFooter>
    </>
  );
}
