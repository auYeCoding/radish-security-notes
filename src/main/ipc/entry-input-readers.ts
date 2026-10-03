import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import type { EntryFieldValues } from "@shared/entries/entry-types";

/**
 * 条目内容类型不对时的错误信息.
 */
export const INVALID_ENTRY_INPUT_MESSAGE = "无效的条目内容";

/**
 * 校验渲染进程传来的值是对象.
 * @param value 渲染进程传来的值.
 * @returns 校验通过的对象.
 * @throws Error 当值不是对象时.
 */
export function requireObject(value: unknown): object {
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
export function readString(source: object, key: string): string {
  const value: unknown = Reflect.get(source, key);
  if (typeof value !== "string") {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 取出对象上的一个可省略的字符串属性.
 * @param source 对象.
 * @param key 属性名.
 * @returns 属性值, 省略 (没有这个属性或值为 undefined) 时为 undefined.
 * @throws Error 当属性存在却不是字符串时.
 */
export function readOptionalString(
  source: object,
  key: string,
): string | undefined {
  const value: unknown = Reflect.get(source, key);
  if (value !== undefined && typeof value !== "string") {
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
export function readBoolean(source: object, key: string): boolean {
  const value: unknown = Reflect.get(source, key);
  if (typeof value !== "boolean") {
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
export function readFieldValues(source: object): EntryFieldValues {
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
 * 取出对象上的自定义字段属性, 它是由两个字符串与一个布尔值组成的对象的数组.
 * @param source 对象.
 * @returns 校验通过的自定义字段输入, 多余的属性被丢弃.
 * @throws Error 当属性不是数组或元素类型不符时.
 */
export function readCustomFields(source: object): NewCustomFieldInput[] {
  const customFields: unknown = Reflect.get(source, "customFields");
  if (!Array.isArray(customFields)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return customFields.map((field: unknown) => requireCustomFieldInput(field));
}
