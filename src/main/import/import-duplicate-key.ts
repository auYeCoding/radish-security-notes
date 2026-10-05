import {
  ACCOUNT_FIELD_KEY,
  URL_FIELD,
} from "@shared/entries/common-entry-fields";
import { foldForComparison } from "@shared/text/is-same-name";

/**
 * 重复判定键里各部分之间的分隔符, 用空字符是因为它不会出现在名称, 账号与网址里.
 */
const KEY_PART_SEPARATOR = "\u0000";

/**
 * 算出一个条目用来判重的键: 名称, 账号与网址三者都相同才算重复, 比较规则与文件夹, 标签的同名
 * 规则一致 (去首尾空格, 忽略 A-Z 大小写). 类型没有账号或网址字段, 或没有填写时, 该项视为空.
 * @param name 条目名称.
 * @param fields 条目的类型字段取值.
 * @returns 判重键.
 */
export function duplicateKeyOf(
  name: string,
  fields: Readonly<Record<string, string>>,
): string {
  return [name, fields[ACCOUNT_FIELD_KEY] ?? "", fields[URL_FIELD.key] ?? ""]
    .map(foldForComparison)
    .join(KEY_PART_SEPARATOR);
}
