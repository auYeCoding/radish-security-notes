import { isSameName } from "../text/is-same-name";

/**
 * 判断两个标签名称是否算同名: 去首尾空格后忽略英文字母 (A-Z 与 a-z) 的大小写比较, 别的字母
 * 区分大小写, 规则与文件夹一致.
 * @param first 第一个名称.
 * @param second 第二个名称.
 * @returns 同名时返回 true.
 */
export function isSameTagName(first: string, second: string): boolean {
  return isSameName(first, second);
}
