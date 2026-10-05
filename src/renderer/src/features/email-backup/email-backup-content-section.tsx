import { useTranslation } from "react-i18next";

import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";
import { EXPORT_PASSPHRASE_MIN_LENGTH } from "@shared/export/export-limits";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { PassphraseFields } from "@renderer/components/passphrase-fields";
import { WarningAlert } from "@renderer/components/warning-alert";

import type { EmailBackupDraft } from "./email-backup-draft";
import { findDraftPassphraseProblem } from "./email-backup-draft-rules";

/**
 * 备份内容区的属性.
 */
interface EmailBackupContentSectionProps {
  /**
   * 用户正在填写的内容.
   */
  readonly draft: EmailBackupDraft;
  /**
   * 已保存的设置视图, 决定口令框的说明文字.
   */
  readonly view: EmailBackupSettingsView;
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<EmailBackupDraft>) => void;
}

/**
 * 加密口令框: 口令与确认口令. 已保存过口令时说明里写明 "已保存", 两个框都留空表示保持不变.
 * @param props 组件属性.
 * @returns 口令字段元素.
 */
function EncryptionFields(
  props: EmailBackupContentSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { draft, view } = props;
  const minLength = EXPORT_PASSPHRASE_MIN_LENGTH;
  return (
    <PassphraseFields
      passphrase={draft.passphrase}
      confirmation={draft.passphraseConfirmation}
      problem={findDraftPassphraseProblem(draft, view)}
      labels={{
        passphrase: t("emailBackup.content.encryption.passphraseLabel"),
        confirmation: t("emailBackup.content.encryption.confirmationLabel"),
        hint: t(
          view.hasPassphrase && view.isEncrypted
            ? "emailBackup.content.encryption.savedHint"
            : "emailBackup.content.encryption.hint",
          { minLength },
        ),
        tooShort: t("emailBackup.content.encryption.error.tooShort", {
          minLength,
        }),
        mismatch: t("emailBackup.content.encryption.error.mismatch"),
      }}
      onPassphraseChange={(passphrase) => props.onChange({ passphrase })}
      onConfirmationChange={(passphraseConfirmation) =>
        props.onChange({ passphraseConfirmation })
      }
    />
  );
}

/**
 * 明文备份的风险提示与必须勾选的确认.
 * @param props 组件属性.
 * @returns 风险提示元素.
 */
function PlaintextRisk(
  props: EmailBackupContentSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <WarningAlert
        title={t("emailBackup.content.plaintextWarning.title")}
        description={t("emailBackup.content.plaintextWarning.description")}
      />
      <CheckboxField
        label={t("emailBackup.content.acknowledge")}
        isChecked={props.draft.hasAcknowledgedPlaintextRisk}
        onCheckedChange={(hasAcknowledgedPlaintextRisk) =>
          props.onChange({ hasAcknowledgedPlaintextRisk })
        }
      />
    </>
  );
}

/**
 * 备份内容区: 说明备份的格式, 加密勾选, 加密时是口令框, 不加密时是明文风险提示与必须勾选的确认.
 * @param props 组件属性.
 * @returns 备份内容区元素.
 */
export function EmailBackupContentSection(
  props: EmailBackupContentSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("emailBackup.content.heading")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("emailBackup.content.description")}
      </p>
      <CheckboxField
        label={t("emailBackup.content.encryption.enable")}
        description={t("emailBackup.content.encryption.enableHint")}
        isChecked={props.draft.isEncrypted}
        onCheckedChange={(isEncrypted) => props.onChange({ isEncrypted })}
      />
      {props.draft.isEncrypted ? (
        <EncryptionFields {...props} />
      ) : (
        <PlaintextRisk {...props} />
      )}
    </section>
  );
}
