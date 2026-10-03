import { isHanCharacter } from "./is-han-character";

/**
 * 名称的三个类别, 数值就是类别之间的先后: 纯英文在前, 中英混杂居中, 纯中文在后.
 */
export const NAME_CATEGORY = {
  english: 0,
  mixed: 1,
  chinese: 2,
} as const;

/**
 * 名称的类别.
 */
export type NameCategory = (typeof NAME_CATEGORY)[keyof typeof NAME_CATEGORY];

/**
 * 匹配英文一侧的字符: 汉字之外的字母与数字, 其它文字 (假名, 西里尔字母, 带重音的拉丁字母) 也算.
 */
const ENGLISH_SIDE_CHARACTER = /[\p{L}\p{N}]/u;

/**
 * 判断一个字符是否属于英文一侧: 不是汉字, 且是字母或数字. 符号, 空格与表情不属于任何一侧.
 * @param character 单个字符 (一个码点).
 * @returns 属于英文一侧时返回 true.
 */
function isEnglishSide(character: string): boolean {
  return !isHanCharacter(character) && ENGLISH_SIDE_CHARACTER.test(character);
}

/**
 * 判定名称的类别: 没有汉字是纯英文 (纯数字与纯符号也是); 有汉字而没有英文一侧的字符是纯中文;
 * 汉字与英文一侧的字符并存是中英混杂.
 * @param name 名称.
 * @returns 名称的类别.
 */
export function classifyName(name: string): NameCategory {
  const characters = Array.from(name);
  if (!characters.some(isHanCharacter)) {
    return NAME_CATEGORY.english;
  }
  return characters.some(isEnglishSide)
    ? NAME_CATEGORY.mixed
    : NAME_CATEGORY.chinese;
}
