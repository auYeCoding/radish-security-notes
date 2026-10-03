/**
 * 匹配属于汉字文字 (Unicode 的 Han 文字) 的字符, 含扩展区与 〇, 々 这类汉字记号.
 */
const HAN_CHARACTER = /\p{Script=Han}/u;

/**
 * 判断一个字符是否是汉字.
 * @param character 单个字符 (一个码点).
 * @returns 是汉字时返回 true.
 */
export function isHanCharacter(character: string): boolean {
  return HAN_CHARACTER.test(character);
}
