import type {
  EditedCustomEntryTypeFieldInput,
  RemoveCustomEntryTypeInput,
  UpdateCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-edit-types";

import { requireFieldInput } from "./custom-entry-type-input-guard";
import {
  INVALID_ENTRY_INPUT_MESSAGE,
  readBoolean,
  readOptionalString,
  readString,
  requireObject,
} from "./entry-input-readers";

/**
 * 校验编辑时提交的一个字段: 在新建时的字段之上多一个可省略的字段键.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的字段输入, 多余的属性被丢弃, 字段键省略时不带这一项.
 * @throws Error 当类型不符时.
 */
function requireEditedFieldInput(
  input: unknown,
): EditedCustomEntryTypeFieldInput {
  const field = requireFieldInput(input);
  const key = readOptionalString(requireObject(input), "key");
  return key === undefined ? field : { ...field, key };
}

/**
 * 校验渲染进程传来的修改自定义类型输入: 类型编号与名称是字符串, 字段是数组且每个字段由字段名,
 * 共享层定义的取值形态, 保密标记, 摘要标记与可省略的字段键组成, 确认标记是布尔值. 名称与字段是否
 * 合规, 字段键是否属于该类型, 是否重名, 是否需要确认等规则由服务判定, 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的修改输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireUpdateCustomEntryTypeInput(
  input: unknown,
): UpdateCustomEntryTypeInput {
  const source = requireObject(input);
  const fields: unknown = Reflect.get(source, "fields");
  if (!Array.isArray(fields)) {
    throw new Error(INVALID_ENTRY_INPUT_MESSAGE);
  }
  return {
    id: readString(source, "id"),
    name: readString(source, "name"),
    fields: fields.map((field: unknown) => requireEditedFieldInput(field)),
    isImpactConfirmed: readBoolean(source, "isImpactConfirmed"),
  };
}

/**
 * 校验渲染进程传来的删除自定义类型输入: 类型编号是字符串, 确认标记是布尔值.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的删除输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireRemoveCustomEntryTypeInput(
  input: unknown,
): RemoveCustomEntryTypeInput {
  const source = requireObject(input);
  return {
    id: readString(source, "id"),
    isImpactConfirmed: readBoolean(source, "isImpactConfirmed"),
  };
}
