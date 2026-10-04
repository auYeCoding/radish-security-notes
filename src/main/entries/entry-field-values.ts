import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import {
  NOTES_FIELD_KEY,
  type EntryFieldValues,
} from "@shared/entries/entry-types";

import type { EntryRecord } from "./entry-repository";

/**
 * 按类型补全已保存的类型字段取值: 类型的每个字段都有一项, 没有存过的取空串, 类型之外的键
 * 被丢弃.
 * @param type 条目的类型定义.
 * @param stored 条目表里保存的类型字段取值.
 * @returns 补全后的类型字段取值, 顺序与类型的字段顺序一致.
 */
export function normalizeFieldValues(
  type: EntryTypeDefinition,
  stored: EntryFieldValues,
): EntryFieldValues {
  return Object.fromEntries(
    type.fields.map((field) => [field.key, stored[field.key] ?? ""]),
  );
}

/**
 * 按字段名取条目要复制到剪贴板的值: 字段名是备注或条目类型里的字段键.
 * @param record 条目所在的行.
 * @param type 条目的类型定义, 找不到类型时为 undefined.
 * @param fieldKey 渲染进程要求复制的字段名.
 * @returns 要复制的值, 字段名不是备注也不属于条目类型时为 undefined.
 */
export function findCopyValue(
  record: EntryRecord,
  type: EntryTypeDefinition | undefined,
  fieldKey: string,
): string | undefined {
  if (fieldKey === NOTES_FIELD_KEY) {
    return record.notes;
  }
  const isTypeField = type?.fields.some((field) => field.key === fieldKey);
  return isTypeField === true ? (record.fields[fieldKey] ?? "") : undefined;
}
