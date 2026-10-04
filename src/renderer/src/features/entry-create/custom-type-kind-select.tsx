import { useId, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  CUSTOM_FIELD_KINDS,
  isCustomFieldKind,
  type CustomFieldKind,
} from "@shared/entries/custom-types/custom-field-kinds";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import { canBeSummary } from "@shared/entries/custom-types/custom-field-summary";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";

/**
 * 下拉里的一个取值形态选项.
 */
interface KindItem {
  /**
   * 选项的取值.
   */
  readonly value: CustomFieldKind;
  /**
   * 选项显示的文字.
   */
  readonly label: string;
}

/**
 * 取值形态下拉的属性.
 */
interface CustomTypeKindSelectProps {
  /**
   * 这个字段在字段数组里的位置, 从 0 开始.
   */
  readonly index: number;
}

/**
 * 生成下拉的全部选项: 共享层定义的每个取值形态, 文字是当前语言的名称.
 * @returns 选项列表.
 */
function useKindItems(): readonly KindItem[] {
  const { t } = useTranslation();
  return useMemo(
    () =>
      CUSTOM_FIELD_KINDS.map((kind) => ({
        value: kind,
        label: t(`entryCreate.customType.kind.${kind}`),
      })),
    [t],
  );
}

/**
 * 字段行里的 "取值形态" 下拉: 选项是共享层定义的全部取值形态. 改成多行时, 这个字段不能再作列表
 * 摘要, 摘要标记随之取消. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function CustomTypeKindSelect(
  props: CustomTypeKindSelectProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const labelIdentifier = useId();
  const { control, getValues, setValue } =
    useFormContext<CustomEntryTypeFormValues>();
  const items = useKindItems();
  return (
    <Controller
      control={control}
      name={`fields.${props.index}.kind`}
      render={({ field }) => (
        <Field className="w-auto">
          <FieldLabel id={labelIdentifier}>
            {t("entryCreate.customType.kindLabel")}
          </FieldLabel>
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => {
              if (!isCustomFieldKind(value)) {
                return;
              }
              const current = getValues(`fields.${props.index}`);
              field.onChange(value);
              if (!canBeSummary({ ...current, kind: value })) {
                setValue(`fields.${props.index}.isSummary`, false);
              }
            }}
          >
            <SelectTrigger aria-labelledby={labelIdentifier} className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}
