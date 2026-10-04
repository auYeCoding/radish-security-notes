import { ENTRY_ACCOUNT_MAX_LENGTH } from "../common-entry-fields";
import type {
  EntryFieldDefinition,
  EntryTypeDefinition,
} from "../entry-field-types";
import { CUSTOM_SUMMARY_FIELD_KEY } from "./custom-entry-type-key";
import { isMultiLineKind } from "./custom-field-kinds";
import type {
  CustomEntryType,
  CustomEntryTypeField,
} from "./custom-entry-type-types";

/**
 * 把自定义类型的一个字段转成通用的字段定义: 多行形态对应多行字段, 摘要字段的取值长度上限与
 * 预设类型的账号字段一致.
 * @param field 已保存的字段.
 * @returns 字段定义.
 */
function toFieldDefinition(field: CustomEntryTypeField): EntryFieldDefinition {
  return {
    key: field.key,
    name: field.name,
    isSensitive: field.isSensitive,
    isMultiline: isMultiLineKind(field.kind),
    maxLength:
      field.key === CUSTOM_SUMMARY_FIELD_KEY
        ? ENTRY_ACCOUNT_MAX_LENGTH
        : undefined,
  };
}

/**
 * 把已保存的自定义类型转成通用的类型定义, 条目的校验, 表单, 详情, 搜索与预设类型走同一套代码.
 * @param type 已保存的自定义类型.
 * @returns 带类型名称与字段名的类型定义.
 */
export function toEntryTypeDefinition(
  type: CustomEntryType,
): EntryTypeDefinition {
  return {
    key: type.key,
    name: type.name,
    fields: type.fields.map(toFieldDefinition),
  };
}
