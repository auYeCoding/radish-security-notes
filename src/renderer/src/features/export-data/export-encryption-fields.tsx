import { useTranslation } from "react-i18next";

import { EXPORT_PASSPHRASE_MIN_LENGTH } from "@shared/export/export-limits";

import { CheckboxField } from "@renderer/components/checkbox-field";
import { PasswordField } from "@renderer/components/password-field";

import { findPassphraseProblem, type ExportDraft } from "./export-draft";

/**
 * 加密口令字段的属性.
 */
interface ExportEncryptionFieldsProps {
  /**
   * 第一步填写的内容.
   */
  readonly draft: ExportDraft;
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<ExportDraft>) => void;
}

/**
 * 口令与确认口令两个输入框. 口令太短的提示在开始输入口令后出现, 两次不一致的提示在开始输入确认口令
 * 后出现.
 * @param props 组件属性.
 * @returns 两个输入框元素.
 */
function PassphraseInputs(
  props: ExportEncryptionFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { draft } = props;
  const problem = findPassphraseProblem(draft);
  const minLength = EXPORT_PASSPHRASE_MIN_LENGTH;
  return (
    <>
      <PasswordField
        label={t("export.options.encryption.passphraseLabel")}
        description={t("export.options.encryption.hint", { minLength })}
        autoComplete="off"
        value={draft.passphrase}
        onChange={(event) => props.onChange({ passphrase: event.target.value })}
        error={
          problem === "too-short" && draft.passphrase !== ""
            ? t("export.options.encryption.error.tooShort", { minLength })
            : undefined
        }
      />
      <PasswordField
        label={t("export.options.encryption.confirmationLabel")}
        autoComplete="off"
        value={draft.passphraseConfirmation}
        onChange={(event) =>
          props.onChange({ passphraseConfirmation: event.target.value })
        }
        error={
          problem === "mismatch" && draft.passphraseConfirmation !== ""
            ? t("export.options.encryption.error.mismatch")
            : undefined
        }
      />
    </>
  );
}

/**
 * 口令加密: 一个勾选, 勾选后是口令与确认口令两个输入框.
 * @param props 组件属性.
 * @returns 加密选项元素.
 */
export function ExportEncryptionFields(
  props: ExportEncryptionFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("export.options.encryption.heading")}
      </h3>
      <CheckboxField
        label={t("export.options.encryption.enable")}
        description={t("export.options.encryption.enableHint")}
        isChecked={props.draft.isEncrypted}
        onCheckedChange={(isEncrypted) => props.onChange({ isEncrypted })}
      />
      {props.draft.isEncrypted && <PassphraseInputs {...props} />}
    </section>
  );
}
