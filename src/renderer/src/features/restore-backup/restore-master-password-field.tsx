import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";

/**
 * 主密码字段的属性.
 */
interface RestoreMasterPasswordFieldProps {
  /**
   * 正在输入的主密码.
   */
  readonly value: string;
  /**
   * 上一次提交的主密码是否不对, 不对时在输入框下提示.
   */
  readonly isWrong: boolean;
  /**
   * 改动主密码的回调.
   */
  readonly onChange: (masterPassword: string) => void;
}

/**
 * 恢复前重新输入主密码的字段: 保险库设了主密码时, 确认是本人在操作.
 * @param props 组件属性.
 * @returns 字段元素.
 */
export function RestoreMasterPasswordField(
  props: RestoreMasterPasswordFieldProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PasswordField
      label={t("restore.confirm.masterPassword.label")}
      description={t("restore.confirm.masterPassword.hint")}
      autoComplete="current-password"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      error={
        props.isWrong ? t("restore.failure.wrong-master-password") : undefined
      }
    />
  );
}
