import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import { canBeSummary } from "@shared/entries/custom-types/custom-field-summary";

import { Checkbox } from "@renderer/components/ui/checkbox";
import { Field, FieldLabel } from "@renderer/components/ui/field";

/**
 * 保密勾选框的属性.
 */
interface CustomTypeSensitiveCheckboxProps {
  /**
   * 这个字段在字段数组里的位置, 从 0 开始.
   */
  readonly index: number;
}

/**
 * 字段行里的 "保密" 勾选框: 勾选后字段值在详情里默认遮罩, 不参与搜索, 也不能作列表摘要, 摘要
 * 标记随之取消. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 勾选框字段元素.
 */
export function CustomTypeSensitiveCheckbox(
  props: CustomTypeSensitiveCheckboxProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  const { control, getValues, setValue } =
    useFormContext<CustomEntryTypeFormValues>();
  return (
    <Controller
      control={control}
      name={`fields.${props.index}.isSensitive`}
      render={({ field }) => (
        <Field orientation="horizontal" className="w-auto">
          <Checkbox
            id={identifier}
            checked={field.value}
            onCheckedChange={(checked) => {
              const current = getValues(`fields.${props.index}`);
              field.onChange(checked);
              if (!canBeSummary({ ...current, isSensitive: checked })) {
                setValue(`fields.${props.index}.isSummary`, false);
              }
            }}
          />
          <FieldLabel htmlFor={identifier}>
            {t("entryCreate.customType.sensitiveLabel")}
          </FieldLabel>
        </Field>
      )}
    />
  );
}
