import type { NewEntryInput } from "@shared/entries/entry-types";

import {
  readCustomFields,
  readFieldValues,
  readNotesFormat,
  readOptionalString,
  readOptionalStringArray,
  readString,
  requireObject,
} from "./entry-input-readers";

/**
 * 校验渲染进程传来的新建输入: 类型是字符串 (预设类型键或自定义类型键), 名称与备注是字符串, 备注
 * 格式是共享层定义的取值, 类型字段取值是值都为字符串的对象, 自定义字段是由两个字符串与一个布尔值
 * 组成的对象的数组, TOTP 输入是字符串, 所属文件夹编号可省略, 给出时是字符串, 标签编号可省略, 给出时是字符串数组.
 * 类型键是否属于预设或已有的自定义类型, 名称是否为空, 类型字段键是否齐全, TOTP 是否合法, 标签是否存在等规则由服务判定, 这里只保证类型.
 * @param input 渲染进程传来的值.
 * @returns 校验通过的新建输入, 多余的属性被丢弃.
 * @throws Error 当类型不符时.
 */
export function requireNewEntryInput(input: unknown): NewEntryInput {
  const source = requireObject(input);
  return {
    type: readString(source, "type"),
    name: readString(source, "name"),
    fields: readFieldValues(source),
    notes: readString(source, "notes"),
    notesFormat: readNotesFormat(source),
    customFields: readCustomFields(source),
    totp: readString(source, "totp"),
    folderId: readOptionalString(source, "folderId"),
    tagIds: readOptionalStringArray(source, "tagIds"),
  };
}
