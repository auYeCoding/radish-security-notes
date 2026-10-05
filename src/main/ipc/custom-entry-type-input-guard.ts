import {
  isCustomFieldKind,
  type CustomFieldKind,
} from "@shared/entries/custom-types/custom-field-kinds";
import type {
  CustomEntryTypeFieldInput,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";

import {
  INVALID_ENTRY_INPUT_MESSAGE,
  readBoolean,
  readString,
  requireObject,
} from "./entry-input-readers";

/**
 * 取出对象上的取值形态属性.
 * @param source 对象.
 * @returns 取值形态.
 * @throws Error 当属性不是共享层定义的取值形态时.
 */
function readFieldKind(source: object): CustomFieldKind {
  const value: unknown = Reflect.get(source, "kind");
  if (!isCustomFieldKind(value)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return value;
}

/**
 * 校验一个字段由字段名, 取值形态, 保密标记与摘要标记组成.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的字段输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireFieldInput(input: unknown): CustomEntryTypeFieldInput {
  const source = requireObject(input);
  return {
    name: readString(source, "name"),
    kind: readFieldKind(source),
    isSensitive: readBoolean(source, "isSensitive"),
    isSummary: readBoolean(source, "isSummary"),
  };
}

/**
 * 校验渲染进程传来的新建自定义类型输入: 名称是字符串, 字段是数组, 每个字段由字段名, 共享层定义的
 * 取值形态, 保密标记与摘要标记组成. 名称与字段名是否为空, 是否过长或重复, 个数是否超限, 摘要字段
 * 是否合法, 是否与已有类型重名等规则由服务判定, 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的新建类型输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireNewCustomEntryTypeInput(
  input: unknown,
): NewCustomEntryTypeInput {
  const source = requireObject(input);
  const fields: unknown = Reflect.get(source, "fields");
  if (!Array.isArray(fields)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return {
    name: readString(source, "name"),
    fields: fields.map((field: unknown) => requireFieldInput(field)),
  };
}
