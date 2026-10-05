import { ExportConfirmStep } from "./export-confirm-step";
import { ExportOptionsStep } from "./export-options-step";
import { ExportProgressStep } from "./export-progress-step";
import { ExportResultStep } from "./export-result-step";
import type { ExportFlow } from "./use-export-flow";

/**
 * 步骤视图的属性.
 */
interface ExportStepViewProps {
  /**
   * 导出流程.
   */
  readonly flow: ExportFlow;
  /**
   * 点 "完成" 时关闭对话框的回调.
   */
  readonly onDone: () => void;
}

/**
 * 按流程当前的步骤显示对应的内容: 选择格式与范围, 确认, 处理中, 结果.
 * @param props 组件属性.
 * @returns 当前步骤的元素.
 */
export function ExportStepView(props: ExportStepViewProps): React.JSX.Element {
  const { flow } = props;
  const { state } = flow;
  switch (state.step) {
    case "options":
      return (
        <ExportOptionsStep
          draft={state.draft}
          scopeIds={flow.scopeIds}
          scopeSummary={flow.scopeSummary}
          onChange={flow.changeDraft}
          onNext={flow.goToConfirm}
        />
      );
    case "confirm":
      return (
        <ExportConfirmStep
          state={state}
          scopeSummary={flow.scopeSummary}
          onAcknowledgedChange={flow.changeAcknowledged}
          onMasterPasswordChange={flow.changeMasterPassword}
          onBack={flow.backToOptions}
          onExport={() => void flow.exportNow()}
        />
      );
    case "working":
      return (
        <ExportProgressStep
          progress={flow.progress}
          onCancel={flow.cancelWork}
        />
      );
    default:
      return (
        <ExportResultStep
          summary={state.summary}
          notice={state.notice}
          onRevealFile={() => void flow.revealFile()}
          onDone={props.onDone}
        />
      );
  }
}
