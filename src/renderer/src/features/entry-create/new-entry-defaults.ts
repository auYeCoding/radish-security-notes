import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import { DEFAULT_NOTES_FORMAT } from "@shared/entries/notes-format";
import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

/**
 * 某个类型的新建表单默认取值: 名称与类型的每个字段都为空, 没有自定义字段, 备注与 TOTP, 所属文件夹
 * 是调用方给出的 (侧栏当前选中的文件夹), 没有给出时为无文件夹, 不带标签, 备注格式是默认格式.
 * @param type 条目类型定义.
 * @param folderId 默认所属文件夹的编号, 没有所属文件夹时为 undefined.
 * @returns 表单默认取值.
 */
export function createDefaultFormValues(
  type: EntryTypeDefinition,
  folderId?: string,
): NewEntryFormValues {
  return {
    name: "",
    fields: Object.fromEntries(type.fields.map((field) => [field.key, ""])),
    notes: "",
    notesFormat: DEFAULT_NOTES_FORMAT,
    customFields: [],
    totp: "",
    folderId,
    tagIds: undefined,
  };
}
