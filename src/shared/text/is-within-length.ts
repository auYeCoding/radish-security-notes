/**
 * 判断文本是否没有超过最多字符数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param value 待判断的文本.
 * @param maxLength 允许的最多字符数.
 * @returns 没有超过时返回 true.
 */
export function isWithinLength(value: string, maxLength: number): boolean {
  return Array.from(value).length <= maxLength;
}
