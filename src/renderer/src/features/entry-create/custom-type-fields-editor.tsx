import { PlusIcon } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { CUSTOM_ENTRY_TYPE_MAX_FIELDS } from "@shared/entries/custom-types/custom-entry-type-limits";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import { Button } from "@renderer/components/ui/button";
import {
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@renderer/components/ui/field";
import { RadioGroup } from "@renderer/components/ui/radio-group";

import { EMPTY_CUSTOM_TYPE_FIELD } from "./custom-type-defaults";
import { describeCustomTypeError } from "./custom-type-errors";
import { CustomTypeFieldRow } from "./custom-type-field-row";
import { CustomTypeSummaryNone } from "./custom-type-summary-none";
import { useCustomTypeSummary } from "./use-custom-type-summary";

/**
 * 新建类型表单里的字段区: 标题, 摘要说明, 任意数量的字段行, "不设列表摘要" 单选项与 "添加字段"
 * 按钮. 字段行里的摘要单选项与 "不设列表摘要" 同属一个单选组, 同一个类型至多一个摘要字段. 字段数
 * 达到上限时禁用 "添加字段". 必须在 `FormProvider` 里使用.
 * @returns 字段区元素.
 */
export function CustomTypeFieldsEditor(): React.JSX.Element {
  const { t } = useTranslation();
  const { control, formState } = useFormContext<CustomEntryTypeFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "fields",
  });
  const summary = useCustomTypeSummary();
  return (
    <FieldSet>
      <FieldLegend variant="label">
        {t("entryCreate.customType.fieldsLegend")}
      </FieldLegend>
      <FieldDescription>
        {t("entryCreate.customType.summaryHelp")}
      </FieldDescription>
      <RadioGroup
        aria-label={t("entryCreate.customType.summaryGroup")}
        value={summary.value}
        onValueChange={summary.select}
      >
        {fields.map((field, index) => (
          <CustomTypeFieldRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
        <CustomTypeSummaryNone />
      </RadioGroup>
      <FieldError>
        {describeCustomTypeError(formState.errors.fields?.root?.message, t) ??
          describeCustomTypeError(formState.errors.fields?.message, t)}
      </FieldError>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={fields.length >= CUSTOM_ENTRY_TYPE_MAX_FIELDS}
        onClick={() => append({ ...EMPTY_CUSTOM_TYPE_FIELD })}
      >
        <PlusIcon aria-hidden="true" />
        {t("entryCreate.customType.addField")}
      </Button>
    </FieldSet>
  );
}
