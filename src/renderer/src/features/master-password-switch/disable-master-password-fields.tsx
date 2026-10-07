import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldDescription, FieldGroup } from "@renderer/components/ui/field";
import { WarningAlert } from "@renderer/components/warning-alert";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

import { DisableAcknowledgementField } from "./disable-acknowledgement-field";
import {
  describeDisableFieldError,
  type DisableMasterPasswordValues,
} from "./disable-master-password-schema";
import { describeMasterPasswordFailure } from "./describe-master-password-failure";

/**
 * 关闭主密码表单字段的属性.
 */
interface DisableMasterPasswordFieldsProps {
  /**
   * 关闭主密码表单.
   */
  readonly form: UseFormReturn<DisableMasterPasswordValues>;
  /**
   * 最近一次提交失败的原因, 没有失败时为 undefined.
   */
  readonly failureReason: VaultFailureReason | undefined;
}

/**
 * 关闭主密码表单里的字段: 顶部失败提示条, 写明关闭后保护强度的风险提示, 当前主密码输入, 确认勾选,
 * 以及提交进行中的等待说明. 当前主密码错误显示在输入框下方, 其它失败显示在顶部提示条.
 * @param props 组件属性.
 * @returns 字段元素.
 */
export function DisableMasterPasswordFields(
  props: DisableMasterPasswordFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { register, control, formState } = props.form;
  const failureMessage = describeMasterPasswordFailure(props.failureReason, t);
  const isWrongPassword = props.failureReason === "wrong-password";
  return (
    <FieldGroup>
      {failureMessage !== undefined && !isWrongPassword && (
        <Alert variant="destructive">
          <AlertDescription>{failureMessage}</AlertDescription>
        </Alert>
      )}
      <WarningAlert
        title={t("settings.security.masterPassword.disable.riskTitle")}
        description={t("settings.security.masterPassword.disable.risk")}
      />
      <PasswordField
        {...register("currentPassword")}
        label={t("settings.security.masterPassword.disable.passwordLabel")}
        autoComplete="current-password"
        error={
          describeDisableFieldError(
            formState.errors.currentPassword?.message,
            t,
          ) ?? (isWrongPassword ? failureMessage : undefined)
        }
      />
      <DisableAcknowledgementField
        control={control}
        errorCode={formState.errors.acknowledged?.message}
      />
      {formState.isSubmitting && (
        <FieldDescription>
          {t("settings.security.masterPassword.disable.pendingNotice")}
        </FieldDescription>
      )}
    </FieldGroup>
  );
}
