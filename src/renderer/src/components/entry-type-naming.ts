import type { TFunction } from "i18next";

import type {
  EntryFieldDefinition,
  EntryTypeDefinition,
} from "@shared/entries/entry-field-types";
import {
  isEntryFieldKey,
  isEntryTypeKey,
} from "@shared/entries/preset-entry-types";

/**
 * 取条目类型的显示名: 自定义类型直接用它的名称, 预设类型按类型键取当前语言的文案.
 * @param type 条目类型定义.
 * @param translate 翻译函数.
 * @returns 类型名.
 */
export function entryTypeName(
  type: EntryTypeDefinition,
  translate: TFunction,
): string {
  if (type.name !== undefined) {
    return type.name;
  }
  return isEntryTypeKey(type.key)
    ? translate(`entryTypes.${type.key}`)
    : type.key;
}

/**
 * 取类型字段的显示名: 自定义类型的字段直接用它的名称, 预设类型的字段按字段键取当前语言的文案.
 * @param field 字段定义.
 * @param translate 翻译函数.
 * @returns 字段名.
 */
export function entryFieldName(
  field: EntryFieldDefinition,
  translate: TFunction,
): string {
  if (field.name !== undefined) {
    return field.name;
  }
  return isEntryFieldKey(field.key)
    ? translate(`entryFields.${field.key}`)
    : field.key;
}
