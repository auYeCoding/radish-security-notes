import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";

import { extraUrlLabel } from "./import-custom-field-labels";
import type { ImportedEntryDraft } from "./source-adapter";

/**
 * 拆开多个网址的结果.
 */
export interface SplitUrls {
  /**
   * 第一个网址, 没有网址时为空串.
   */
  readonly url: string;
  /**
   * 其余网址对应的自定义字段.
   */
  readonly extras: readonly NewCustomFieldInput[];
}

/**
 * 建一个只含名称与类型的草稿, 其余部分取空值, 适配器在它的基础上补充.
 * @param name 条目名称.
 * @param typeKey 本应用的预设类型键, 没有对应类型时为 undefined.
 * @returns 草稿.
 */
export function emptyDraft(
  name: string,
  typeKey: string | undefined,
): ImportedEntryDraft {
  return {
    name,
    typeKey,
    fields: {},
    notes: "",
    customFields: [],
    totp: "",
    folderPath: "",
    tagNames: [],
    losses: [],
  };
}

/**
 * 判断文本去首尾空格后是否非空.
 * @param value 文本.
 * @returns 非空时返回 true.
 */
export function isFilled(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * 值非空时造一个自定义字段, 值为空时没有字段, 用于来源里有而本应用没有对应字段的内容.
 * @param label 字段名.
 * @param value 字段值.
 * @param isHidden 是否是隐藏字段.
 * @returns 只含一个自定义字段的数组, 值为空时为空数组.
 */
export function customFieldIfFilled(
  label: string,
  value: string,
  isHidden: boolean,
): readonly NewCustomFieldInput[] {
  return isFilled(value) ? [{ label, value, isHidden }] : [];
}

/**
 * 把多个网址拆成第一个网址与其余网址对应的自定义字段: 第一个进网址字段, 其余依次写成普通自定义
 * 字段 "网址 2", "网址 3".
 * @param urls 来源里的网址, 已去掉空的.
 * @returns 第一个网址与其余网址的自定义字段.
 */
export function splitUrls(urls: readonly string[]): SplitUrls {
  const [first = "", ...rest] = urls;
  return {
    url: first,
    extras: rest.map((url, index) => ({
      label: extraUrlLabel(index + 2),
      value: url,
      isHidden: false,
    })),
  };
}
