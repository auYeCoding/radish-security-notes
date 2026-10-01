import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

/**
 * 某个类型的新建表单默认取值: 名称与类型的每个字段都为空, 没有自定义字段与备注.
 * @param type 条目类型定义.
 * @returns 表单默认取值.
 */
export function createDefaultFormValues(
  type: PresetEntryTypeDefinition,
): NewEntryFormValues {
  return {
    name: "",
    fields: Object.fromEntries(type.fields.map((field) => [field.key, ""])),
    notes: "",
    customFields: [],
  };
}
