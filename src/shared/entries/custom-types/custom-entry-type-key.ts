import { ACCOUNT_FIELD_KEY } from "../common-entry-fields";

/**
 * 自定义条目类型的类型键前缀. 预设类型键里没有冒号, 加上前缀后两者不会冲突.
 */
export const CUSTOM_TYPE_KEY_PREFIX = "custom:";

/**
 * 自定义条目类型里非摘要字段的字段键前缀, 后面接字段的唯一编号.
 */
export const CUSTOM_FIELD_KEY_PREFIX = "field-";

/**
 * 自定义条目类型里非摘要字段的字段键的类型.
 */
export type CustomFieldKey = `${typeof CUSTOM_FIELD_KEY_PREFIX}${string}`;

/**
 * 由自定义类型的编号生成存进条目 `type` 列的类型键.
 * @param typeId 自定义类型的唯一编号.
 * @returns 类型键.
 */
export function toCustomTypeKey(typeId: string): string {
  return `${CUSTOM_TYPE_KEY_PREFIX}${typeId}`;
}

/**
 * 判断一个类型键是否属于自定义类型.
 * @param key 类型键.
 * @returns 是自定义类型键时返回 true.
 */
export function isCustomTypeKey(key: string): boolean {
  return (
    key.startsWith(CUSTOM_TYPE_KEY_PREFIX) &&
    key.length > CUSTOM_TYPE_KEY_PREFIX.length
  );
}

/**
 * 由自定义类型键取出自定义类型的编号.
 * @param key 自定义类型键.
 * @returns 类型编号, 不是自定义类型键时为 undefined.
 */
export function customTypeIdOf(key: string): string | undefined {
  return isCustomTypeKey(key)
    ? key.slice(CUSTOM_TYPE_KEY_PREFIX.length)
    : undefined;
}

/**
 * 由字段的唯一编号生成非摘要字段的字段键.
 * @param fieldId 字段的唯一编号.
 * @returns 字段键.
 */
export function toCustomFieldKey(fieldId: string): CustomFieldKey {
  return `${CUSTOM_FIELD_KEY_PREFIX}${fieldId}`;
}

/**
 * 判断一个字段键是否是非摘要的自定义字段键.
 * @param key 字段键.
 * @returns 是自定义字段键时返回 true.
 */
export function isCustomFieldKey(key: string): key is CustomFieldKey {
  return (
    key.startsWith(CUSTOM_FIELD_KEY_PREFIX) &&
    key.length > CUSTOM_FIELD_KEY_PREFIX.length
  );
}

/**
 * 被指定为列表摘要的自定义字段使用的字段键, 与预设类型的账号字段一致, 列表账号与搜索账号
 * 都按它取值.
 */
export const CUSTOM_SUMMARY_FIELD_KEY = ACCOUNT_FIELD_KEY;
