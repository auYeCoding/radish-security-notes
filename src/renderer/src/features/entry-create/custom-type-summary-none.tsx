import { useId } from "react";
import { useTranslation } from "react-i18next";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import { RadioGroupItem } from "@renderer/components/ui/radio-group";

/**
 * 摘要单选组里 "不设列表摘要" 一项的取值.
 */
export const SUMMARY_NONE_VALUE = "none";

/**
 * 字段区末尾的 "不设列表摘要" 单选项: 选中时全部字段都不作列表摘要. 必须在摘要单选组里使用.
 * @returns 单选项字段元素.
 */
export function CustomTypeSummaryNone(): React.JSX.Element {
  const { t } = useTranslation();
  const identifier = useId();
  return (
    <Field orientation="horizontal" className="w-auto">
      <RadioGroupItem id={identifier} value={SUMMARY_NONE_VALUE} />
      <FieldLabel htmlFor={identifier}>
        {t("entryCreate.customType.summaryNone")}
      </FieldLabel>
    </Field>
  );
}
