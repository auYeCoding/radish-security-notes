/**
 * 匹配数字串开头的零.
 */
const LEADING_ZEROS = /^0+/;

/**
 * 按整数值比较两个由 ASCII 数字组成的字符串: 去掉前导零后先比位数, 位数相同再逐位比. 不把字符串转成
 * 数字类型, 所以再长的数字串也不会溢出.
 * @param first 第一个数字串.
 * @param second 第二个数字串.
 * @returns 第一个数小于第二个数时为负数, 相等时为 0, 大于时为正数.
 */
export function compareDigitStrings(first: string, second: string): number {
  const firstValue = first.replace(LEADING_ZEROS, "");
  const secondValue = second.replace(LEADING_ZEROS, "");
  if (firstValue.length !== secondValue.length) {
    return firstValue.length - secondValue.length;
  }
  if (firstValue === secondValue) {
    return 0;
  }
  return firstValue < secondValue ? -1 : 1;
}
