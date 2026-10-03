import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

/**
 * 某个类型的新建表单默认取值: 名称与类型的每个字段都为空, 没有自定义字段, 备注与 TOTP, 所属文件夹
 * 是调用方给出的 (侧栏当前选中的文件夹), 没有给出时为未分类.
 * @param type 条目类型定义.
 * @param folderId 默认所属文件夹的编号, 未分类时为 undefined.
 * @returns 表单默认取值.
 */
export function createDefaultFormValues(
  type: PresetEntryTypeDefinition,
  folderId?: string,
): NewEntryFormValues {
  return {
    name: "",
    fields: Object.fromEntries(type.fields.map((field) => [field.key, ""])),
    notes: "",
    customFields: [],
    totp: "",
    folderId,
  };
}
