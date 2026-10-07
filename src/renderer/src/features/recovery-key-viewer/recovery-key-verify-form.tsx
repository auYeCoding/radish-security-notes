import { useTranslation } from "react-i18next";

import { NameDialogShell } from "@renderer/components/name-dialog-shell";
import type { MasterPasswordState } from "@renderer/stores/use-master-password-state";

import { RecoveryKeyVerifyFields } from "./recovery-key-verify-fields";
import { useRecoveryKeyVerifyForm } from "./use-recovery-key-verify-form";

/**
 * 验证表单的属性.
 */
interface RecoveryKeyVerifyFormProps {
  /**
   * 主密码当前的状态, 取自主进程里密钥文件的保护方式.
   */
  readonly protection: MasterPasswordState;
  /**
   * 读不到主密码状态时, 点 "重试" 重新读取的回调.
   */
  readonly onRetry: () => void;
  /**
   * 恢复词是否刚被自动隐藏.
   */
  readonly isAutoHidden: boolean;
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
  /**
   * 验证通过, 主进程给出恢复词之后的回调.
   */
  readonly onVerified: (words: readonly string[]) => void;
}

/**
 * 验证身份的对话框: 设了主密码时输入当前主密码, 由系统保护时勾选已确认周围没有他人查看, 提交后
 * 由主进程重新解出数据密钥并给出恢复词. 读取主密码状态期间显示等待, 读不到时提交按钮变为重试.
 * 失败只在对话框内提示, 不改变保险库状态; 读取与提交进行中不响应关闭.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function RecoveryKeyVerifyForm(
  props: RecoveryKeyVerifyFormProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { form, failureReason, handleSubmit } = useRecoveryKeyVerifyForm(
    props.protection,
    props.onRetry,
    props.onVerified,
  );
  const isLoading = props.protection === "loading";
  const isUnavailable = props.protection === "unavailable";
  return (
    <NameDialogShell
      title={t("settings.security.recoveryKey.verify.title")}
      description={t("settings.security.recoveryKey.verify.description")}
      cancelLabel={t("settings.security.recoveryKey.verify.cancel")}
      submitLabel={t(
        isUnavailable
          ? "settings.security.recoveryKey.verify.retry"
          : "settings.security.recoveryKey.verify.submit",
      )}
      submittingLabel={t(
        isLoading
          ? "settings.security.recoveryKey.verify.loading"
          : "settings.security.recoveryKey.verify.submitting",
      )}
      isSubmitting={form.formState.isSubmitting || isLoading}
      onSubmit={handleSubmit}
      onClose={props.onClose}
    >
      <RecoveryKeyVerifyFields
        protection={props.protection}
        form={form}
        failureReason={failureReason}
        isAutoHidden={props.isAutoHidden}
      />
    </NameDialogShell>
  );
}
