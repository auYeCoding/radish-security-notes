/**
 * 条目类型里一个字段的定义. 预设类型的字段名按字段键从 `entryFields.<字段键>` 取文案, 自定义
 * 类型的字段带 `name`, 直接显示它.
 */
export interface EntryFieldDefinition<Key extends string = string> {
  /**
   * 字段键, 在同一个类型里唯一, 也是存进条目 `fields` 里的键与复制时的字段名.
   */
  readonly key: Key;
  /**
   * 字段名, 只有自定义类型的字段有, 预设类型的字段没有这一项.
   */
  readonly name?: string;
  /**
   * 是否是敏感字段, 敏感字段在详情里默认遮罩.
   */
  readonly isSensitive: boolean;
  /**
   * 是否是多行字段, 多行字段在表单里用多行输入框.
   */
  readonly isMultiline: boolean;
  /**
   * 字段值允许的最多字符数, 不给时不设上限.
   */
  readonly maxLength?: number;
}

/**
 * 定义字段时可以给出的选项, 没给的选项取 false 或不设上限.
 */
export interface EntryFieldOptions {
  /**
   * 是否是敏感字段.
   */
  readonly isSensitive?: boolean;
  /**
   * 是否是多行字段.
   */
  readonly isMultiline?: boolean;
  /**
   * 字段值允许的最多字符数.
   */
  readonly maxLength?: number;
}

/**
 * 定义一个字段, 保留字段键的字面量类型.
 * @param key 字段键.
 * @param options 敏感, 多行与长度上限选项.
 * @returns 字段定义.
 */
export function defineField<const Key extends string>(
  key: Key,
  options: EntryFieldOptions = {},
): EntryFieldDefinition<Key> {
  return {
    key,
    isSensitive: options.isSensitive ?? false,
    isMultiline: options.isMultiline ?? false,
    maxLength: options.maxLength,
  };
}

/**
 * 一个条目类型的定义: 类型键与按显示顺序排列的字段. 预设类型的名称按类型键从
 * `entryTypes.<类型键>` 取文案, 自定义类型带 `name`, 直接显示它. 名称, 自定义字段与备注是所有
 * 类型共有的, 不在这里.
 */
export interface EntryTypeDefinition<
  Key extends string = string,
  FieldKey extends string = string,
> {
  /**
   * 类型键, 存进条目的 `type` 列.
   */
  readonly key: Key;
  /**
   * 类型名称, 只有自定义类型有, 预设类型没有这一项.
   */
  readonly name?: string;
  /**
   * 类型的字段, 顺序就是表单与详情里的顺序.
   */
  readonly fields: readonly EntryFieldDefinition<FieldKey>[];
}

/**
 * 定义一个条目类型, 保留类型键与字段键的字面量类型.
 * @param key 类型键.
 * @param fields 类型的字段, 按显示顺序排列.
 * @returns 类型定义.
 */
export function defineEntryType<
  const Key extends string,
  const FieldKey extends string,
>(
  key: Key,
  fields: readonly EntryFieldDefinition<FieldKey>[],
): EntryTypeDefinition<Key, FieldKey> {
  return { key, fields };
}
