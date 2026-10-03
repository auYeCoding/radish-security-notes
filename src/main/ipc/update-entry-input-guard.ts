import type { UpdateEntryInput } from "@shared/entries/entry-types";

import {
  readBoolean,
  readCustomFields,
  readFieldValues,
  readString,
  requireObject,
} from "./entry-input-readers";

/**
 * 校验渲染进程传来的更新输入: 名称与备注是字符串, 类型字段取值是值都为字符串的对象, 自定义
 * 字段是由两个字符串与一个布尔值组成的对象的数组, TOTP 输入是字符串, 移除 TOTP 是布尔值.
 * 名称是否为空, 类型字段键是否齐全, TOTP 是否合法等规则由服务判定, 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的更新输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireUpdateEntryInput(input: unknown): UpdateEntryInput {
  const source = requireObject(input);
  return {
    name: readString(source, "name"),
    fields: readFieldValues(source),
    notes: readString(source, "notes"),
    customFields: readCustomFields(source),
    totp: readString(source, "totp"),
    removeTotp: readBoolean(source, "removeTotp"),
  };
}
