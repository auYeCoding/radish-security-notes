/**
 * 匹配大写英文字母 A-Z, 比较名称时只折叠这个范围的大小写.
 */
const ENGLISH_UPPERCASE_LETTERS = /[A-Z]/g;

/**
 * 把名称整理成比较用的形式: 去首尾空格, 并把 A-Z 折成小写, 别的字母保持原样. 同名判断与需要
 * 按名称建索引的调用方 (例如导入时的重复判定) 共用这一个折叠规则.
 * @param name 用户填写的名称.
 * @returns 比较用的名称.
 */
export function foldForComparison(name: string): string {
  return name
    .trim()
    .replace(ENGLISH_UPPERCASE_LETTERS, (letter) => letter.toLowerCase());
}

/**
 * 判断两个名称是否算同名: 去首尾空格后忽略英文字母 (A-Z 与 a-z) 的大小写比较,
 * 别的字母 (例如 É 与 é, Д 与 д, 全角 Ａ 与 ａ) 区分大小写. 文件夹与标签共用这条规则.
 * @param first 第一个名称.
 * @param second 第二个名称.
 * @returns 同名时返回 true.
 */
export function isSameName(first: string, second: string): boolean {
  return foldForComparison(first) === foldForComparison(second);
}
