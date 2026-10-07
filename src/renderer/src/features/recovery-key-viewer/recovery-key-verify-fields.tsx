import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";
import type { MasterPasswordState } from "@renderer/stores/use-master-password-state";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

import { describeRecoveryKeyFailure } from "./describe-recovery-key-failure";
import { RecoveryKeyCredentialField } from "./recovery-key-credential-field";
import type { RecoveryKeyVerifyValues } from "./recovery-key-verify-schema";

/**
 * 验证表单字段的属性.
 */
interface RecoveryKeyVerifyFieldsProps {
  /**
   * 主密码当前的状态, 决定显示主密码输入还是确认勾选.
   */
  readonly protection: MasterPasswordState;
  /**
   * 验证表单.
   */
  readonly form: UseFormReturn<RecoveryKeyVerifyValues>;
  /**
   * 最近一次提交失败的原因, 没有失败时为 undefined.
   */
  readonly failureReason: VaultFailureReason | undefined;
  /**
   * 恢复词是否刚被自动隐藏, 是则在顶部说明需要重新验证.
   */
  readonly isAutoHidden: boolean;
}

/**
 * 验证表单里的字段: 顶部的自动隐藏说明, 读不到主密码状态的提示与失败提示条, 以及验证凭据字段.
 * 主密码错误显示在输入框下方, 其它失败显示在顶部提示条.
 * @param props 组件属性.
 * @returns 字段元素.
 */
export function RecoveryKeyVerifyFields(
  props: RecoveryKeyVerifyFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const failureMessage = describeRecoveryKeyFailure(props.failureReason, t);
  const isWrongPassword = props.failureReason === "wrong-password";
  return (
    <FieldGroup>
      {props.isAutoHidden && (
        <Alert role="status">
          <AlertDescription>
            {t("settings.security.recoveryKey.verify.autoHidden")}
          </AlertDescription>
        </Alert>
      )}
      {props.protection === "unavailable" && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("settings.security.recoveryKey.verify.unavailable")}
          </AlertDescription>
        </Alert>
      )}
      {failureMessage !== undefined && !isWrongPassword && (
        <Alert variant="destructive">
          <AlertDescription>{failureMessage}</AlertDescription>
        </Alert>
      )}
      <RecoveryKeyCredentialField
        protection={props.protection}
        form={props.form}
        wrongPasswordMessage={isWrongPassword ? failureMessage : undefined}
      />
    </FieldGroup>
  );
}
