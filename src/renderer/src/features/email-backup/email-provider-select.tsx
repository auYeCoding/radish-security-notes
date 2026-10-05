import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  EMAIL_PROVIDER_KEYS,
  isEmailProviderKey,
  type EmailProviderKey,
} from "@shared/email-backup/email-provider-presets";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";

/**
 * 邮箱类型下拉的属性.
 */
interface EmailProviderSelectProps {
  /**
   * 当前选的邮箱类型.
   */
  readonly value: EmailProviderKey;
  /**
   * 选了别的邮箱类型时的回调.
   */
  readonly onChange: (provider: EmailProviderKey) => void;
}

/**
 * 下拉的一个选项.
 */
interface ProviderItem {
  /**
   * 选项的取值, 是邮箱类型的键.
   */
  readonly value: EmailProviderKey;
  /**
   * 选项显示的文字.
   */
  readonly label: string;
}

/**
 * 邮箱类型下拉: 选项是 QQ, 163, Gmail, Outlook 与自定义 SMTP.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function EmailProviderSelect(
  props: EmailProviderSelectProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const labelIdentifier = useId();
  const items = useMemo<readonly ProviderItem[]>(
    () =>
      EMAIL_PROVIDER_KEYS.map((key) => ({
        value: key,
        label: t(`emailBackup.account.provider.${key}`),
      })),
    [t],
  );
  return (
    <Field>
      <FieldLabel id={labelIdentifier}>
        {t("emailBackup.account.provider.label")}
      </FieldLabel>
      <Select
        items={items}
        value={props.value}
        onValueChange={(value) => {
          if (isEmailProviderKey(value)) {
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
    </Field>
  );
}
