import type { UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  MASTER_PASSWORD_MIN_LENGTH,
  MASTER_PASSWORD_RECOMMENDED_LENGTH,
} from "@shared/vault/master-password-policy";

import { describeNewPasswordError } from "./new-password-error";
import { PasswordField } from "./password-field";

/**
 * 新主密码字段的属性.
 */
interface NewPasswordFieldsProps {
  /**
   * 主密码输入框接入表单库的注册结果.
   */
  readonly passwordProps: UseFormRegisterReturn;
  /**
   * 确认输入框接入表单库的注册结果.
   */
  readonly confirmationProps: UseFormRegisterReturn;
  /**
   * 主密码字段的校验错误代码, 没有错误时为 undefined.
   */
  readonly passwordErrorCode: string | undefined;
  /**
   * 确认字段的校验错误代码, 没有错误时为 undefined.
   */
  readonly confirmationErrorCode: string | undefined;
}

/**
 * 设置新主密码的两个字段: 主密码与确认输入, 校验错误显示在对应字段下方, 主密码字段下方的说明
 * 写明最少字符数与建议字符数 (只提示, 不拦截). 引导页, 开启主密码对话框与凭恢复词恢复后的设置页
 * 共用.
 * @param props 组件属性.
 * @returns 两个字段元素.
 */
export function NewPasswordFields(
  props: NewPasswordFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <PasswordField
        {...props.passwordProps}
        label={t("vault.newPassword.passwordLabel")}
        description={t("vault.newPassword.passwordHint", {
          minLength: MASTER_PASSWORD_MIN_LENGTH,
          recommendedLength: MASTER_PASSWORD_RECOMMENDED_LENGTH,
        })}
        autoComplete="new-password"
        error={describeNewPasswordError(props.passwordErrorCode, t)}
      />
      <PasswordField
        {...props.confirmationProps}
        label={t("vault.newPassword.confirmationLabel")}
        autoComplete="new-password"
        error={describeNewPasswordError(props.confirmationErrorCode, t)}
      />
    </>
  );
}
