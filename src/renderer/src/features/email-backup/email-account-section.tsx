import { useTranslation } from "react-i18next";

import type { EmailBackupFieldProblem } from "@shared/email-backup/email-backup-settings-rules";
import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";
import type { EmailProviderKey } from "@shared/email-backup/email-provider-presets";

import { WarningAlert } from "@renderer/components/warning-alert";

import type { EmailBackupDraft } from "./email-backup-draft";
import { EmailAddressFields } from "./email-address-fields";
import { EmailCustomServerFields } from "./email-custom-server-fields";
import { EmailProviderSelect } from "./email-provider-select";

/**
 * 邮箱账号区的属性.
 */
interface EmailAccountSectionProps {
  /**
   * 用户正在填写的内容.
   */
  readonly draft: EmailBackupDraft;
  /**
   * 已保存的设置视图.
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
  /**
   * 换邮箱类型的回调.
   */
  readonly onProviderChange: (provider: EmailProviderKey) => void;
}

/**
 * 邮箱账号区: 邮箱类型, 自定义类型的服务器, 邮箱地址, 授权码, 收件邮箱与单封上限. 选 Outlook 时给出
 * 明确提示, 说明本版本不支持它的现代认证.
 * @param props 组件属性.
 * @returns 邮箱账号区元素.
 */
export function EmailAccountSection(
  props: EmailAccountSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { draft } = props;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("emailBackup.account.heading")}
      </h3>
      <EmailProviderSelect
        value={draft.provider}
        onChange={props.onProviderChange}
      />
      {draft.provider === "outlook" && (
        <WarningAlert
          title={t("emailBackup.account.outlookNotice.title")}
          description={t("emailBackup.account.outlookNotice.description")}
        />
      )}
      {draft.provider === "custom" && (
        <EmailCustomServerFields
          draft={draft}
          problems={props.problems}
          onChange={props.onChange}
        />
      )}
      <EmailAddressFields
        draft={draft}
        view={props.view}
        problems={props.problems}
        isAuthenticationFailed={props.isAuthenticationFailed}
        onChange={props.onChange}
      />
    </section>
  );
}
