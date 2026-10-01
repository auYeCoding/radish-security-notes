import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { TextField } from "@renderer/components/text-field";

import { describeNewEntryError } from "./new-entry-errors";

/**
 * 新建表单的名称输入, 所有类型共有, 必填. 必须在 `FormProvider` 里使用, 校验错误显示在
 * 输入框下方.
 * @returns 名称字段元素.
 */
export function NewEntryNameField(): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  return (
    <TextField
      {...register("name")}
      label={t("entryCreate.nameLabel")}
      autoComplete="off"
      error={describeNewEntryError(formState.errors.name?.message, t)}
    />
  );
}
