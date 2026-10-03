/**
 * 数文本里的字符个数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param value 待计数的文本.
 * @returns 字符个数.
 */
export function countCharacters(value: string): number {
  return Array.from(value).length;
}
