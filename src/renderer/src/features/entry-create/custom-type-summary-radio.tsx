import { useId } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import { canBeSummary } from "@shared/entries/custom-types/custom-field-summary";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import { RadioGroupItem } from "@renderer/components/ui/radio-group";

/**
 * 摘要单选项的属性.
 */
interface CustomTypeSummaryRadioProps {
  /**
   * 这个字段在字段数组里的位置, 从 0 开始, 也是单选项的取值.
   */
  readonly index: number;
}

/**
 * 字段行里的 "列表摘要" 单选项: 属于字段区的摘要单选组, 同一个类型只能选一个. 保密字段与多行
 * 字段不能作摘要, 这个单选项被禁用. 必须在 `FormProvider` 与摘要单选组里使用.
 * @param props 组件属性.
 * @returns 单选项字段元素.
 */
export function CustomTypeSummaryRadio(
  props: CustomTypeSummaryRadioProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  const { control } = useFormContext<CustomEntryTypeFormValues>();
  const field = useWatch({ control, name: `fields.${props.index}` });
  const isDisabled = !canBeSummary(field);
  return (
    <Field orientation="horizontal" className="w-auto">
      <RadioGroupItem
        id={identifier}
        value={String(props.index)}
        disabled={isDisabled}
      />
      <FieldLabel htmlFor={identifier}>
        {t("entryCreate.customType.summaryLabel")}
      </FieldLabel>
    </Field>
  );
}
