import { pinyinInitialOf } from "../name-sorting/han-pinyin-initial";
import { isHanCharacter } from "../name-sorting/is-han-character";
import { convertWithOrigins, foldText, type FoldedText } from "./fold-text";

/**
 * 把一个字符转成它在首字母串里的样子: 有拼音读音的汉字取拼音首字母, 其余字符 (含没有读音的汉字)
 * 按规范化规则转换.
 * @param character 单个字符 (一个码点).
 * @returns 首字母串里对应的文本.
 */
function toInitialOrFolded(character: string): string {
  if (isHanCharacter(character)) {
    return pinyinInitialOf(character) ?? foldText(character);
  }
  return foldText(character);
}

/**
 * 判断文本里是否有汉字.
 * @param text 文本.
 * @returns 有汉字时返回 true.
 */
function hasHanCharacter(text: string): boolean {
  return Array.from(text).some(isHanCharacter);
}

/**
 * 把文本转成首字母串用于匹配拼音首字母: 汉字换成拼音首字母, 其余字符规范化. 文本里没有汉字时结果
 * 与 `foldText` 相同.
 * @param text 原文.
 * @returns 首字母串.
 */
export function pinyinInitialsText(text: string): string {
  if (!hasHanCharacter(text)) {
    return foldText(text);
  }
  return Array.from(text, toInitialOrFolded).join("");
}

/**
 * 把文本转成首字母串并记录每个字符对应的原位置, 结果的 `folded` 与 `pinyinInitialsText` 一致.
 * @param text 原文.
 * @returns 首字母串与每个字符对应的原文区间.
 */
export function pinyinInitialsWithOrigins(text: string): FoldedText {
  return convertWithOrigins(text, toInitialOrFolded);
}
