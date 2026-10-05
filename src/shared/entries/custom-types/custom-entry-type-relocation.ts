import type { EntryCustomField } from "../custom-field-types";
import type { EntryFieldValues } from "../entry-types";
import { SECURE_NOTE_TYPE } from "../preset-types/secure-note-type";
import type { CustomEntryType } from "./custom-entry-type-types";

/**
 * 自定义类型被删除后, 它名下的条目改归入的预设类型的类型键: 安全笔记.
 */
export const RELOCATION_TARGET_TYPE_KEY: string = SECURE_NOTE_TYPE.key;

/**
 * 条目改归入安全笔记后的取值与自定义字段.
 */
export interface RelocatedEntryValues {
  /**
   * 条目改归后的类型字段取值, 原类型的取值都已转走, 所以是空对象.
   */
  readonly fields: EntryFieldValues;
  /**
   * 条目改归后的自定义字段: 原有的在前, 原类型里有值的字段按字段顺序接在后面.
   */
  readonly customFields: readonly EntryCustomField[];
}

/**
 * 生成转移取值需要的信息.
 */
export interface EntryRelocationSource {
  /**
   * 被删除的自定义类型.
   */
  readonly type: CustomEntryType;
  /**
   * 条目表里保存的类型字段取值.
   */
  readonly stored: EntryFieldValues;
  /**
   * 条目原有的自定义字段.
   */
  readonly customFields: readonly EntryCustomField[];
  /**
   * 生成唯一编号的函数, 每个新增的自定义字段依次取用.
   */
  readonly createIdentifier: () => string;
}

/**
 * 把一个条目在被删除类型里的字段取值转成条目的自定义字段: 每个有值的字段转成一个自定义字段, 字段名
 * 取原字段名, 保密字段转成隐藏字段, 空值不转; 类型字段取值清空, 条目不再留着旧键下的值.
 * @param source 被删除的类型, 条目的取值与自定义字段, 编号生成函数.
 * @returns 条目改归后的类型字段取值与自定义字段.
 */
export function relocateEntryValues(
  source: EntryRelocationSource,
): RelocatedEntryValues {
  const { type, stored, createIdentifier } = source;
  const converted = type.fields.flatMap((field) => {
    const value = stored[field.key] ?? "";
    return value === ""
      ? []
      : [
          {
            id: createIdentifier(),
            label: field.name,
            value,
            isHidden: field.isSensitive,
          },
        ];
  });
  return { fields: {}, customFields: [...source.customFields, ...converted] };
}
