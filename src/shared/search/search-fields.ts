import {
  isCustomFieldKey,
  type CustomFieldKey,
} from "../entries/custom-types/custom-entry-type-key";
import type {
  EntryFieldDefinition,
  EntryTypeDefinition,
} from "../entries/entry-field-types";
import {
  PRESET_ENTRY_TYPES,
  type EntryFieldKey,
  type PresetEntryTypeDefinition,
} from "../entries/preset-entry-types";

/**
 * 条目名称在命中字段里的名字.
 */
export const SEARCH_NAME_FIELD = "name";

/**
 * 备注在命中字段里的名字.
 */
export const SEARCH_NOTES_FIELD = "notes";

/**
 * 自定义字段的字段名在命中字段里的名字, 自定义字段的值不参与搜索.
 */
export const SEARCH_CUSTOM_FIELD_LABEL_FIELD = "customFieldLabel";

/**
 * 标签名在命中字段里的名字.
 */
export const SEARCH_TAG_FIELD = "tag";

/**
 * 搜索命中的字段: 名称, 备注, 条目的自定义字段名, 标签名, 预设类型里的非保密字段键, 或自定义
 * 类型里的非保密字段键.
 */
export type EntrySearchField =
  | typeof SEARCH_NAME_FIELD
  | typeof SEARCH_NOTES_FIELD
  | typeof SEARCH_CUSTOM_FIELD_LABEL_FIELD
  | typeof SEARCH_TAG_FIELD
  | EntryFieldKey
  | CustomFieldKey;

/**
 * 做拼音首字母匹配的字段: 名称与标签名.
 */
const PINYIN_SEARCH_FIELDS: ReadonlySet<EntrySearchField> = new Set([
  SEARCH_NAME_FIELD,
  SEARCH_TAG_FIELD,
]);

/**
 * 全部预设类型, 取消字面量元组类型后便于遍历.
 */
const PRESET_TYPES: readonly PresetEntryTypeDefinition[] = PRESET_ENTRY_TYPES;

/**
 * 全部预设类型里出现过的字段定义, 同一个字段键在多个类型里会出现多次.
 */
const ALL_FIELD_DEFINITIONS = PRESET_TYPES.flatMap((type) => type.fields);

/**
 * 在任何类型里被标为敏感的字段键. 搜索的键白名单必须排除它们, 否则同键的敏感字段会随白名单被读取.
 */
const SENSITIVE_FIELD_KEYS: ReadonlySet<string> = new Set(
  ALL_FIELD_DEFINITIONS.filter((field) => field.isSensitive).map(
    (field) => field.key,
  ),
);

/**
 * 参与搜索的类型字段键: 在所有类型里都没有被标为敏感的字段键, 也是主进程读取类型字段时的键白名单.
 */
export const SEARCHABLE_FIELD_KEYS: readonly EntryFieldKey[] = Array.from(
  new Set(
    ALL_FIELD_DEFINITIONS.filter(
      (field) => !SENSITIVE_FIELD_KEYS.has(field.key),
    ).map((field) => field.key),
  ),
);

/**
 * 参与搜索的类型字段键的集合, 用来判断任意字符串是否是参与搜索的字段键.
 */
const SEARCHABLE_FIELD_KEY_SET: ReadonlySet<string> = new Set(
  SEARCHABLE_FIELD_KEYS,
);

/**
 * 判断一个字符串是否是搜索文档里可以出现的类型字段键: 预设类型里参与搜索的字段键, 或自定义类型
 * 的非摘要字段键. 共享层不知道自定义字段是否保密, 保密的自定义字段不进搜索文档由主进程保证.
 * @param key 待判断的字符串.
 * @returns 是搜索文档里可以出现的类型字段键时返回 true.
 */
export function isSearchableFieldKey(
  key: string,
): key is EntryFieldKey | CustomFieldKey {
  return SEARCHABLE_FIELD_KEY_SET.has(key) || isCustomFieldKey(key);
}

/**
 * 判断一个字段是否参与搜索: 自身不是保密字段, 且字段键在任何预设类型里都没有被标为保密.
 * @param field 字段定义.
 * @returns 参与搜索时返回 true.
 */
function isSearchableField(field: EntryFieldDefinition): boolean {
  return !field.isSensitive && !SENSITIVE_FIELD_KEYS.has(field.key);
}

/**
 * 取一个类型里参与搜索的字段键, 保持类型里的字段顺序. 预设与自定义类型适用同一条规则.
 * @param type 条目的类型定义.
 * @returns 该类型里参与搜索的字段键.
 */
export function searchableFieldKeysOf(
  type: EntryTypeDefinition,
): readonly string[] {
  return type.fields.filter(isSearchableField).map((field) => field.key);
}

/**
 * 判断一个字段是否做拼音首字母匹配.
 * @param field 命中字段.
 * @returns 做拼音首字母匹配时返回 true.
 */
export function isPinyinSearchField(field: EntrySearchField): boolean {
  return PINYIN_SEARCH_FIELDS.has(field);
}
