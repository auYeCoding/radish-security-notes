import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { TextareaField } from "@renderer/components/textarea-field";

import { NotesFormatField } from "./notes-format-field";

/**
 * 条目表单的备注字段, 新建与编辑共用: 标签行右侧是备注格式选择, 下方是多行输入框, 输入的是备注
 * 原文. 必须在 `FormProvider` 里使用.
 * @returns 备注字段元素.
 */
export function NotesField(): React.JSX.Element {
  const { t } = useTranslation();
  const { register } = useFormContext<NewEntryFormValues>();
  return (
    <TextareaField
      {...register("notes")}
      label={t("entryForm.notesLabel")}
      autoComplete="off"
      labelAction={<NotesFormatField />}
    />
  );
}
