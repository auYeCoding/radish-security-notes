import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import type {
  EntryFieldValues,
  NewEntryInput,
} from "@shared/entries/entry-types";
import {
  isEntryTypeKey,
  type EntryTypeKey,
} from "@shared/entries/preset-entry-types";

/**
 * 新建内容类型不对时的错误信息.
 */
const INVALID_ENTRY_INPUT_MESSAGE = "无效的条目内容";

/**
 * 校验渲染进程传来的值是对象.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的对象.
 * @throws Error 当值不是对象时.
 */
function requireObject(value: unknown): object {
  if (typeof value !== "object" || value === null) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 取出对象上的一个字符串属性.
 * @param source 对象.
 * @param key 属性名.
 * @returns 属性值.
 * @throws Error 当属性不是字符串时.
 */
function readString(source: object, key: string): string {
  const value: unknown = Reflect.get(source, key);
  if (typeof value !== "string") {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 取出对象上的一个布尔属性.
 * @param source 对象.
 * @param key 属性名.
 * @returns 属性值.
 * @throws Error 当属性不是布尔值时.
 */
function readBoolean(source: object, key: string): boolean {
  const value: unknown = Reflect.get(source, key);
  if (typeof value !== "boolean") {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 取出对象上的类型键属性.
 * @param source 对象.
 * @returns 预设条目类型的类型键.
 * @throws Error 当属性不是预设类型键时.
 */
function readEntryTypeKey(source: object): EntryTypeKey {
  const value: unknown = Reflect.get(source, "type");
  if (!isEntryTypeKey(value)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 取出对象上的类型字段取值属性, 它是值都为字符串的对象.
 * @param source 对象.
 * @returns 字段键到字符串值的取值.
 * @throws Error 当属性不是值都为字符串的对象时.
 */
function readFieldValues(source: object): EntryFieldValues {
  const fields = requireObject(Reflect.get(source, "fields"));
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]: [string, unknown]) => {
      if (typeof value !== "string") {
        throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
      }
      return [key, value];
    }),
  );
}

/**
 * 校验一个自定义字段由字段名, 字段值两个字符串与一个隐藏标记组成.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的自定义字段输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
function requireCustomFieldInput(input: unknown): NewCustomFieldInput {
  const source = requireObject(input);
  return {
    label: readString(source, "label"),
    value: readString(source, "value"),
    isHidden: readBoolean(source, "isHidden"),
  };
}

/**
 * 校验渲染进程传来的新建输入: 类型是预设类型键, 名称与备注是字符串, 类型字段取值是值都为
 * 字符串的对象, 自定义字段是由两个字符串与一个布尔值组成的对象的数组. 名称是否为空, 类型
 * 字段键是否齐全等规则由服务判定, 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的新建输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireNewEntryInput(input: unknown): NewEntryInput {
  const source = requireObject(input);
  const customFields: unknown = Reflect.get(source, "customFields");
  if (!Array.isArray(customFields)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return {
    type: readEntryTypeKey(source),
    name: readString(source, "name"),
    fields: readFieldValues(source),
    notes: readString(source, "notes"),
    customFields: customFields.map((field: unknown) =>
      requireCustomFieldInput(field),
    ),
  };
}
