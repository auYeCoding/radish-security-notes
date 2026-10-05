import { useTranslation } from "react-i18next";

import {
  EMAIL_SIZE_LIMIT_MAX_MEBIBYTES,
  EMAIL_SIZE_LIMIT_MIN_MEBIBYTES,
} from "@shared/email-backup/email-backup-limits";
import type { EmailBackupFieldProblem } from "@shared/email-backup/email-backup-settings-rules";
import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";

import { PasswordField } from "@renderer/components/password-field";
import { TextField } from "@renderer/components/text-field";

import type { EmailBackupDraft } from "./email-backup-draft";
import { fieldErrorOf } from "./email-field-error";

/**
 * 邮箱地址, 授权码与上限字段的属性.
 */
interface EmailAddressFieldsProps {
  /**
   * 用户正在填写的内容.
   */
  readonly draft: EmailBackupDraft;
  /**
   * 已保存的设置视图, 决定授权码框的说明文字.
   */
  readonly view: EmailBackupSettingsView;
  /**
   * 全部字段问题.
   */
  readonly problems: readonly EmailBackupFieldProblem[];
  /**
   * 认证失败后授权码框要提示重新填写.
   */
  readonly isAuthenticationFailed: boolean;
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<EmailBackupDraft>) => void;
}

/**
 * 发件邮箱与授权码. 授权码框不回显已保存的授权码, 只在说明里写明 "已保存", 留空表示保持不变; 认证
 * 失败后授权码框标红并提示重新填写, 用户可以直接重填.
 * @param props 组件属性.
 * @returns 字段元素.
 */
function SenderFields(props: EmailAddressFieldsProps): React.JSX.Element {
  const { t } = useTranslation();
  const { draft, view, problems, onChange } = props;
  return (
    <>
      <TextField
        label={t("emailBackup.account.sender.label")}
        description={t("emailBackup.account.sender.hint")}
        type="email"
        autoComplete="off"
        value={draft.senderAddress}
        onChange={(event) => onChange({ senderAddress: event.target.value })}
        error={fieldErrorOf(problems, "senderAddress", draft.senderAddress, t)}
      />
      <PasswordField
        label={t("emailBackup.account.authorizationCode.label")}
        description={t(
          view.hasAuthorizationCode
            ? "emailBackup.account.authorizationCode.savedHint"
            : "emailBackup.account.authorizationCode.hint",
        )}
        autoComplete="off"
        value={draft.authorizationCode}
        onChange={(event) =>
          onChange({ authorizationCode: event.target.value })
        }
        error={
          props.isAuthenticationFailed
            ? t("emailBackup.account.authorizationCode.reenter")
            : undefined
        }
      />
    </>
  );
}

/**
 * 收件邮箱与单封邮件上限.
 * @param props 组件属性.
 * @returns 字段元素.
 */
function DeliveryFields(props: EmailAddressFieldsProps): React.JSX.Element {
  const { t } = useTranslation();
  const { draft, problems, onChange } = props;
  return (
    <>
      <TextField
        label={t("emailBackup.account.recipient.label")}
        description={t("emailBackup.account.recipient.hint")}
        type="email"
        autoComplete="off"
        value={draft.recipientAddress}
        onChange={(event) => onChange({ recipientAddress: event.target.value })}
        error={fieldErrorOf(
          problems,
          "recipientAddress",
          draft.recipientAddress,
          t,
        )}
      />
      <TextField
        label={t("emailBackup.account.sizeLimit.label")}
        description={t("emailBackup.account.sizeLimit.hint")}
        type="number"
        inputMode="numeric"
        min={EMAIL_SIZE_LIMIT_MIN_MEBIBYTES}
        max={EMAIL_SIZE_LIMIT_MAX_MEBIBYTES}
        value={draft.sizeLimitMebibytes}
        onChange={(event) =>
          onChange({ sizeLimitMebibytes: event.target.value })
        }
        error={fieldErrorOf(
          problems,
          "sizeLimitMebibytes",
          draft.sizeLimitMebibytes,
          t,
        )}
      />
    </>
  );
}

/**
 * 邮箱账号字段: 邮箱地址, 授权码, 收件邮箱与单封邮件上限.
 * @param props 组件属性.
 * @returns 字段元素.
 */
export function EmailAddressFields(
  props: EmailAddressFieldsProps,
): React.JSX.Element {
  return (
    <>
      <SenderFields {...props} />
      <DeliveryFields {...props} />
    </>
  );
}
