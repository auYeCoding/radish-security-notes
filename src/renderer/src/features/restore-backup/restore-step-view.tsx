import { RestoreFailureStep } from "./restore-failure-step";
import { RestorePassphraseStep } from "./restore-passphrase-step";
import { RestorePickStep } from "./restore-pick-step";
import { RestorePreviewStep } from "./restore-preview-step";
import { RestoreProgressStep } from "./restore-progress-step";
import { RestoreResultStep } from "./restore-result-step";
import type { RestoreFlow } from "./use-restore-flow";

/**
 * 步骤视图的属性.
 */
interface RestoreStepViewProps {
  /**
   * 恢复流程.
   */
  readonly flow: RestoreFlow;
  /**
   * 点 "完成" 时关闭对话框的回调.
   */
  readonly onDone: () => void;
}

/**
 * 按流程当前的步骤显示对应的内容: 选择文件, 输入口令, 预览, 处理中, 结果, 失败.
 * @param props 组件属性.
 * @returns 当前步骤的元素.
 */
export function RestoreStepView(
  props: RestoreStepViewProps,
): React.JSX.Element {
  const { flow } = props;
  const { state } = flow;
  switch (state.step) {
    case "pick":
      return <RestorePickStep onChooseFile={() => void flow.chooseFile()} />;
    case "passphrase":
      return (
        <RestorePassphraseStep
          state={state}
          onPassphraseChange={flow.changePassphrase}
          onSubmit={() => void flow.submitPassphrase()}
          onBack={flow.backToPick}
        />
      );
    case "preview":
      return (
        <RestorePreviewStep
          state={state}
          onMasterPasswordChange={flow.changeMasterPassword}
          onAcknowledgedReplaceChange={flow.changeAcknowledgedReplace}
          onConfirm={() => void flow.confirm()}
          onBack={flow.backToPick}
        />
      );
    case "working":
      return <RestoreProgressStep progress={flow.progress} />;
    case "result":
      return (
        <RestoreResultStep outcome={state.outcome} onDone={props.onDone} />
      );
    default:
      return (
        <RestoreFailureStep failure={state.failure} onBack={flow.backToPick} />
      );
  }
}
