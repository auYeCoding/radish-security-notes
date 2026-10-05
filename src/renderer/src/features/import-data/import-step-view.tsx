import type { ImportFlow } from "./use-import-flow";
import { ImportPreviewStep } from "./import-preview-step";
import { ImportProgressStep } from "./import-progress-step";
import { ImportResultStep } from "./import-result-step";
import { ImportSourceStep } from "./import-source-step";

/**
 * 步骤视图的属性.
 */
interface ImportStepViewProps {
  /**
   * 导入流程.
   */
  readonly flow: ImportFlow;
  /**
   * 点 "完成" 时关闭对话框的回调.
   */
  readonly onDone: () => void;
}

/**
 * 按流程当前的步骤显示对应的内容: 选择来源, 处理中, 预览, 结果.
 * @param props 组件属性.
 * @returns 当前步骤的元素.
 */
export function ImportStepView(props: ImportStepViewProps): React.JSX.Element {
  const { flow } = props;
  const { state } = flow;
  switch (state.step) {
    case "source":
      return (
        <ImportSourceStep
          sourceKey={state.sourceKey}
          failure={state.failure}
          onSelect={flow.selectSource}
          onChooseFile={() => void flow.chooseFile()}
        />
      );
    case "working":
      return (
        <ImportProgressStep
          progress={flow.progress}
          onCancel={state.task === "choosing" ? flow.cancelWork : undefined}
        />
      );
    case "preview":
      return (
        <ImportPreviewStep
          preview={state.preview}
          duplicatePolicy={state.duplicatePolicy}
          onPolicyChange={flow.changePolicy}
          onConfirm={() => void flow.confirm()}
          onBack={flow.backToSource}
        />
      );
    default:
      return (
        <ImportResultStep
          outcome={state.outcome}
          notice={state.notice}
          onSaveReport={() => void flow.saveReport()}
          onRevealFile={() => void flow.revealFile()}
          onDone={props.onDone}
        />
      );
  }
}
