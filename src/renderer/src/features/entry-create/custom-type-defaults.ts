import { DEFAULT_CUSTOM_FIELD_KIND } from "@shared/entries/custom-types/custom-field-kinds";
import type {
  CustomEntryTypeFieldFormValues,
  CustomEntryTypeFormValues,
} from "@shared/entries/custom-types/custom-entry-type-schema";

/**
 * 点击 "添加字段" 时追加的新字段: 字段名为空, 单行, 不保密, 不作列表摘要.
 */
export const EMPTY_CUSTOM_TYPE_FIELD: CustomEntryTypeFieldFormValues = {
  name: "",
  kind: DEFAULT_CUSTOM_FIELD_KIND,
  isSensitive: false,
  isSummary: false,
};

/**
 * 新建类型表单的默认取值: 类型名称为空, 带一个空字段行.
 * @returns 表单默认取值.
 */
export function createDefaultCustomTypeValues(): CustomEntryTypeFormValues {
  return { name: "", fields: [{ ...EMPTY_CUSTOM_TYPE_FIELD }] };
}
