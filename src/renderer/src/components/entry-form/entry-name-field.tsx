import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { TextField } from "@renderer/components/text-field";

import { describeEntryFormError } from "./entry-form-errors";

/**
 * 条目表单的名称输入, 所有类型共有, 必填, 新建与编辑共用. 必须在 `FormProvider` 里使用, 校验
 * 错误显示在输入框下方.
 * @returns 名称字段元素.
 */
export function EntryNameField(): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  return (
    <TextField
      {...register("name")}
      label={t("entryForm.nameLabel")}
      autoComplete="off"
      error={describeEntryFormError(formState.errors.name?.message, t)}
    />
  );
}
