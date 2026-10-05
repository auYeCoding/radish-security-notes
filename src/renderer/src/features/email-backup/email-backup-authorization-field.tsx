import { useTranslation } from "react-i18next";

import { PasswordField } from "@renderer/components/password-field";

/**
 * 主密码字段的属性.
 */
interface EmailBackupAuthorizationFieldProps {
  /**
   * 主密码输入框的内容.
   */
  readonly value: string;
  /**
   * 主密码不对时为 true, 输入框标红.
   */
  readonly isWrong: boolean;
  /**
   * 内容改变的回调.
   */
  readonly onChange: (value: string) => void;
}

/**
 * 重新输入主密码的字段: 保存设置与立即备份会交出全部凭据, 设了主密码时要用户重新输入主密码确认
 * 是本人操作. 没设主密码时不显示.
 * @param props 组件属性.
 * @returns 主密码字段元素.
 */
export function EmailBackupAuthorizationField(
  props: EmailBackupAuthorizationFieldProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <PasswordField
      label={t("emailBackup.authorization.label")}
      description={t("emailBackup.authorization.hint")}
      autoComplete="current-password"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
      error={
        props.isWrong
          ? t("emailBackup.failure.wrong-master-password")
          : undefined
      }
    />
  );
}
