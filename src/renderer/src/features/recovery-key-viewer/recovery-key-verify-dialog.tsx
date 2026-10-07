import { useMasterPasswordState } from "@renderer/stores/use-master-password-state";

import { RecoveryKeyVerifyForm } from "./recovery-key-verify-form";

/**
 * 验证步骤对话框的属性.
 */
interface RecoveryKeyVerifyDialogProps {
  /**
   * 恢复词是否刚被自动隐藏.
   */
  readonly isAutoHidden: boolean;
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
  /**
   * 验证通过, 主进程给出恢复词之后的回调.
   */
  readonly onVerified: (words: readonly string[]) => void;
}

/**
 * 查看恢复密钥的验证步骤, 挂载即打开, 关闭即卸载. 每次挂载都向主进程重新读取当前是否设了
 * 主密码, 不沿用设置对话框里别处读到的旧状态, 所以刚开启或关闭主密码之后验证方式立即跟着变.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function RecoveryKeyVerifyDialog(
  props: RecoveryKeyVerifyDialogProps,
): React.JSX.Element {
  const { state, refresh } = useMasterPasswordState();
  return (
    <RecoveryKeyVerifyForm
      protection={state}
      onRetry={refresh}
      isAutoHidden={props.isAutoHidden}
      onClose={props.onClose}
      onVerified={props.onVerified}
    />
  );
}
