import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { EntryFieldDefinition } from "@shared/entries/entry-field-types";
import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { EntryFieldKey } from "@shared/entries/preset-entry-types";

import { PasswordField } from "@renderer/components/password-field";
import { TextareaField } from "@renderer/components/textarea-field";
import { TextField } from "@renderer/components/text-field";

import { describeFieldError } from "./new-entry-errors";

/**
 * 类型字段输入的属性.
 */
interface TypeFieldInputProps {
  /**
   * 要输入的字段定义.
   */
  readonly field: EntryFieldDefinition<EntryFieldKey>;
}

/**
 * 新建表单里类型的一个字段: 多行字段用多行输入框, 敏感的单行字段用带显示与隐藏切换的输入框,
 * 其余用普通输入框, 标签是字段名, 超长的错误显示在输入框下方. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 字段输入元素.
 */
export function TypeFieldInput(props: TypeFieldInputProps): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  const { field } = props;
  const label = t(`entryFields.${field.key}`);
  const registration = register(`fields.${field.key}`);
  const error = describeFieldError(
    formState.errors.fields?.[field.key]?.message,
    field,
    t,
  );
  if (field.isMultiline) {
    return (
      <TextareaField
        {...registration}
        label={label}
        autoComplete="off"
        error={error}
      />
    );
  }
  if (field.isSensitive) {
    return (
      <PasswordField
        {...registration}
        label={label}
        autoComplete="off"
        error={error}
        showLabel={t("entryDetail.showField", { label })}
        hideLabel={t("entryDetail.hideField", { label })}
      />
    );
  }
  return (
    <TextField
      {...registration}
      label={label}
      autoComplete="off"
      error={error}
    />
  );
}
