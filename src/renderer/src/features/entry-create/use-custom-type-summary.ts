import { useFormContext, useWatch } from "react-hook-form";

import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import { SUMMARY_NONE_VALUE } from "./custom-type-summary-none";

/**
 * 摘要单选组的取值与选择方法.
 */
export interface CustomTypeSummary {
  /**
   * 单选组当前选中的取值: 作摘要的字段的位置, 没有摘要字段时是 "不设列表摘要" 的取值.
   */
  readonly value: string;
  /**
   * 选中一项: 被选中位置的字段成为摘要字段, 其余字段都不是; 选中 "不设列表摘要" 时全部字段都不是.
   * @param selected 被选中项的取值.
   */
  readonly select: (selected: string) => void;
}

/**
 * 读取新建类型表单里的摘要选择状态, 并给出改变它的方法. 摘要标记按字段存在表单取值里, 同一个类型
 * 至多一个字段带标记. 必须在 `FormProvider` 里使用.
 * @returns 摘要单选组的取值与选择方法.
 */
export function useCustomTypeSummary(): CustomTypeSummary {
  const { control, setValue } = useFormContext<CustomEntryTypeFormValues>();
  const fields = useWatch({ control, name: "fields" });
  const summaryIndex = fields.findIndex((field) => field.isSummary);
  return {
    value: summaryIndex < 0 ? SUMMARY_NONE_VALUE : String(summaryIndex),
    select: (selected) => {
      fields.forEach((_field, index) =>
        setValue(`fields.${index}.isSummary`, String(index) === selected, {
          shouldDirty: true,
        }),
      );
    },
  };
}
