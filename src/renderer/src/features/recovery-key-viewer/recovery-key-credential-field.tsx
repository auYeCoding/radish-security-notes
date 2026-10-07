import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { PasswordField } from "@renderer/components/password-field";
import { FieldError } from "@renderer/components/ui/field";
import type { MasterPasswordState } from "@renderer/stores/use-master-password-state";

import {
  describeVerifyFieldError,
  type RecoveryKeyVerifyValues,
} from "./recovery-key-verify-schema";

/**
 * 验证凭据字段的属性.
 */
interface RecoveryKeyCredentialFieldProps {
  /**
   * 主密码当前的状态, 决定显示主密码输入, 确认勾选, 还是什么都不显示.
   */
  readonly protection: MasterPasswordState;
  /**
   * 验证表单.
   */
  readonly form: UseFormReturn<RecoveryKeyVerifyValues>;
  /**
   * 主密码输入框下方要显示的 "主密码不正确" 提示, 没有时为 undefined.
   */
  readonly wrongPasswordMessage: string | undefined;
}

/**
 * 验证凭据字段: 设了主密码时是当前主密码输入, 由系统保护时是 "周围没有他人查看" 确认勾选与
 * 未勾选时的错误, 状态还没读到或读不到时什么都不显示.
 * @param props 组件属性.
 * @returns 字段元素, 没有字段时为 null.
 */
export function RecoveryKeyCredentialField(
  props: RecoveryKeyCredentialFieldProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const { register, control, formState } = props.form;
  if (props.protection === "enabled") {
    return (
      <PasswordField
        {...register("currentPassword")}
        label={t("settings.security.recoveryKey.verify.passwordLabel")}
        autoComplete="current-password"
        error={
          describeVerifyFieldError(
            formState.errors.currentPassword?.message,
            t,
          ) ?? props.wrongPasswordMessage
        }
      />
    );
  }
  if (props.protection === "disabled") {
    return (
      <>
        <Controller
          control={control}
          name="acknowledged"
          render={({ field }) => (
            <CheckboxField
              label={t("settings.security.recoveryKey.verify.acknowledgeLabel")}
              isChecked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FieldError>
          {describeVerifyFieldError(formState.errors.acknowledged?.message, t)}
        </FieldError>
      </>
    );
  }
  return null;
}
