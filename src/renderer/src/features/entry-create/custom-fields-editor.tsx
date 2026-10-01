import { PlusIcon } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import { Button } from "@renderer/components/ui/button";
import { FieldLegend, FieldSet } from "@renderer/components/ui/field";

import { CustomFieldRow } from "./custom-field-row";

/**
 * 点击 "添加字段" 时追加的新字段: 字段名与字段值为空, 不隐藏.
 */
const EMPTY_CUSTOM_FIELD: NewCustomFieldInput = {
  label: "",
  value: "",
  isHidden: false,
};

/**
 * 新建表单里的自定义字段区: 标题, 任意数量的字段行与 "添加字段" 按钮. 默认没有字段行. 必须在
 * `FormProvider` 里使用.
 * @returns 自定义字段区元素.
 */
export function CustomFieldsEditor(): React.JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<NewEntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "customFields",
  });
  return (
    <FieldSet>
      <FieldLegend variant="label">
        {t("entryCreate.customFields.legend")}
      </FieldLegend>
      {fields.map((field, index) => (
        <CustomFieldRow
          key={field.id}
          index={index}
          onRemove={() => remove(index)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append(EMPTY_CUSTOM_FIELD)}
      >
        <PlusIcon aria-hidden="true" />
        {t("entryCreate.customFields.add")}
      </Button>
    </FieldSet>
  );
}
