import { Trash2Icon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { TextareaField } from "@renderer/components/textarea-field";
import { TextField } from "@renderer/components/text-field";
import { Button } from "@renderer/components/ui/button";

import { CustomFieldHiddenCheckbox } from "./custom-field-hidden-checkbox";
import { describeEntryFormError } from "./entry-form-errors";

/**
 * 条目表单里一个自定义字段行的属性.
 */
interface CustomFieldRowProps {
  /**
   * 这个字段在自定义字段数组里的位置, 从 0 开始.
   */
  readonly index: number;
  /**
   * 点击删除按钮时的回调.
   */
  readonly onRemove: () => void;
}

/**
 * 条目表单里的一个自定义字段: 字段名, 多行字段值, "隐藏" 勾选与删除按钮, 新建与编辑共用.
 * 必须在 `FormProvider` 里使用, 字段名为空的错误显示在字段名下方.
 * @param props 组件属性.
 * @returns 自定义字段行元素.
 */
export function CustomFieldRow(props: CustomFieldRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<NewEntryFormValues>();
  const { index } = props;
  const position = index + 1;
  return (
    <div
      role="group"
      aria-label={t("entryForm.customFields.group", { index: position })}
      className="flex flex-col gap-3 rounded-xl border border-border p-3"
    >
      <TextField
        {...register(`customFields.${index}.label`)}
        label={t("entryForm.customFields.labelLabel")}
        autoComplete="off"
        error={describeEntryFormError(
          formState.errors.customFields?.[index]?.label?.message,
          t,
        )}
      />
      <TextareaField
        {...register(`customFields.${index}.value`)}
        label={t("entryForm.customFields.valueLabel")}
        autoComplete="off"
      />
      <div className="flex items-center justify-between gap-2">
        <CustomFieldHiddenCheckbox index={index} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("entryForm.customFields.remove", {
            index: position,
          })}
          onClick={props.onRemove}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
