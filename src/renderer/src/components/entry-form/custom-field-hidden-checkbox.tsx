import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { Checkbox } from "@renderer/components/ui/checkbox";
import { Field, FieldLabel } from "@renderer/components/ui/field";

/**
 * 隐藏勾选框的属性.
 */
interface CustomFieldHiddenCheckboxProps {
  /**
   * 这个字段在自定义字段数组里的位置, 从 0 开始.
   */
  readonly index: number;
}

/**
 * 自定义字段行里的 "隐藏" 勾选框: 勾选后字段在详情里默认遮罩. 必须在 `FormProvider` 里使用.
 * 新建与编辑条目的表单共用.
 * @param props 组件属性.
 * @returns 勾选框字段元素.
 */
export function CustomFieldHiddenCheckbox(
  props: CustomFieldHiddenCheckboxProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  const { control } = useFormContext<NewEntryFormValues>();
  return (
    <Controller
      control={control}
      name={`customFields.${props.index}.isHidden`}
      render={({ field }) => (
        <Field orientation="horizontal" className="w-auto">
          <Checkbox
            id={identifier}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
          <FieldLabel htmlFor={identifier}>
            {t("entryForm.customFields.hiddenLabel")}
          </FieldLabel>
        </Field>
      )}
    />
  );
}
