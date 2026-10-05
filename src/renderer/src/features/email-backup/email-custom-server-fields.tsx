import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { EmailBackupFieldProblem } from "@shared/email-backup/email-backup-settings-rules";
import {
  EMAIL_CONNECTION_SECURITIES,
  isEmailConnectionSecurity,
  type EmailConnectionSecurity,
} from "@shared/email-backup/email-provider-presets";

import { TextField } from "@renderer/components/text-field";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@renderer/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";

import type { EmailBackupDraft } from "./email-backup-draft";
import { fieldErrorOf } from "./email-field-error";

/**
 * 自定义服务器字段的属性.
 */
interface EmailCustomServerFieldsProps {
  /**
   * 用户正在填写的内容.
   */
  readonly draft: EmailBackupDraft;
  /**
   * 全部字段问题.
   */
  readonly problems: readonly EmailBackupFieldProblem[];
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<EmailBackupDraft>) => void;
}

/**
 * 加密连接方式下拉的属性.
 */
interface SecuritySelectProps {
  /**
   * 当前选的连接方式.
   */
  readonly value: EmailConnectionSecurity;
  /**
   * 选了别的连接方式时的回调.
   */
  readonly onChange: (security: EmailConnectionSecurity) => void;
}

/**
 * 加密连接方式下拉: SSL 与 STARTTLS, 都不会在加密失败时退回明文.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
function SecuritySelect(props: SecuritySelectProps): React.JSX.Element {
  const { t } = useTranslation();
  const labelIdentifier = useId();
  const items = EMAIL_CONNECTION_SECURITIES.map((security) => ({
    value: security,
    label: t(`emailBackup.account.security.${security}`),
  }));
  return (
    <Field>
      <FieldLabel id={labelIdentifier}>
        {t("emailBackup.account.security.label")}
      </FieldLabel>
      <Select
        items={items}
        value={props.value}
        onValueChange={(value) => {
          if (isEmailConnectionSecurity(value)) {
            props.onChange(value);
          }
        }}
      >
        <SelectTrigger aria-labelledby={labelIdentifier} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>
        {t("emailBackup.account.security.hint")}
      </FieldDescription>
    </Field>
  );
}

/**
 * 自定义 SMTP 类型的服务器字段: 服务器地址, 端口与加密连接方式. 预置类型的这三项取预置表, 不显示.
 * @param props 组件属性.
 * @returns 字段元素.
 */
export function EmailCustomServerFields(
  props: EmailCustomServerFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { draft, problems, onChange } = props;
  return (
    <>
      <TextField
        label={t("emailBackup.account.host.label")}
        autoComplete="off"
        value={draft.host}
        onChange={(event) => onChange({ host: event.target.value })}
        error={fieldErrorOf(problems, "host", draft.host, t)}
      />
      <TextField
        label={t("emailBackup.account.port.label")}
        type="number"
        inputMode="numeric"
        autoComplete="off"
        value={draft.port}
        onChange={(event) => onChange({ port: event.target.value })}
        error={fieldErrorOf(problems, "port", draft.port, t)}
      />
      <SecuritySelect
        value={draft.security}
        onChange={(security) => onChange({ security })}
      />
    </>
  );
}
