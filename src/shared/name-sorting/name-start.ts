import { pinyinInitialOf } from "./han-pinyin-initial";
import { isHanCharacter } from "./is-han-character";

/**
 * 名称开头的四个分组, 数值就是分组之间的先后: 符号 (含表情与其它文字) 在前, 数字其次, 字母 (含汉字的
 * 拼音首字母) 再次, 没有拼音读音的汉字在最后.
 */
export const NAME_START_GROUP = {
  symbol: 0,
  digit: 1,
  letter: 2,
  noPinyin: 3,
} as const;

/**
 * 名称开头的分组.
 */
export type NameStartGroup =
  (typeof NAME_START_GROUP)[keyof typeof NAME_START_GROUP];

/**
 * 名称的开头, 用来比较名称.
 */
export interface NameStart {
  /**
   * 分组.
   */
  readonly group: NameStartGroup;
  /**
   * 组内次序: 符号组是第一个字符的码点, 字母组是 a 至 z 的序号 (0 至 25), 数字组与没有拼音的汉字组
   * 恒为 0.
   */
  readonly rank: number;
  /**
   * 数字组的开头连续的 ASCII 数字串, 按整数值比较; 其它组为空串.
   */
  readonly digits: string;
}

/**
 * 小写字母 a 的码点, 字母序号从它算起.
 */
const LOWERCASE_A_CODE_POINT = "a".codePointAt(0) ?? 0;

/**
 * 匹配名称开头连续的 ASCII 数字.
 */
const LEADING_DIGITS = /^[0-9]+/;

/**
 * 匹配单个 ASCII 英文字母.
 */
const ENGLISH_LETTER = /^[A-Za-z]$/;

/**
 * 不在数字组时的数字串.
 */
const NO_DIGITS = "";

/**
 * 空名称的开头, 排在最前.
 */
const EMPTY_NAME_START: NameStart = {
  group: NAME_START_GROUP.symbol,
  rank: 0,
  digits: NO_DIGITS,
};

/**
 * 取字母 (a 至 z, 不分大小写) 的序号.
 * @param letter 单个英文字母.
 * @returns 0 至 25 的序号.
 */
function letterRank(letter: string): number {
  const codePoint =
    letter.toLowerCase().codePointAt(0) ?? LOWERCASE_A_CODE_POINT;
  return codePoint - LOWERCASE_A_CODE_POINT;
}

/**
 * 取汉字开头的名称的开头: 有拼音读音时按拼音首字母排在字母组, 没有时排在最后一组.
 * @param hanCharacter 名称的第一个汉字.
 * @returns 名称的开头.
 */
function startOfHan(hanCharacter: string): NameStart {
  const initial = pinyinInitialOf(hanCharacter);
  return initial === undefined
    ? { group: NAME_START_GROUP.noPinyin, rank: 0, digits: NO_DIGITS }
    : {
        group: NAME_START_GROUP.letter,
        rank: letterRank(initial),
        digits: NO_DIGITS,
      };
}

/**
 * 取名称的开头. 先把名称规范化到兼容分解形式, 使全角字母与数字变成半角, 带重音的字母去掉重音, 兼容
 * 汉字变成统一汉字; 然后看第一个字符: 数字取开头的数字串, 英文字母取字母序号, 汉字取拼音首字母,
 * 其余 (符号, 表情, 假名等其它文字) 取码点.
 * @param name 名称.
 * @returns 名称的开头.
 */
export function readNameStart(name: string): NameStart {
  const normalized = name.normalize("NFKD");
  const first = Array.from(normalized)[0];
  if (first === undefined) {
    return EMPTY_NAME_START;
  }
  const digits = LEADING_DIGITS.exec(normalized);
  if (digits !== null) {
    return { group: NAME_START_GROUP.digit, rank: 0, digits: digits[0] };
  }
  if (ENGLISH_LETTER.test(first)) {
    return {
      group: NAME_START_GROUP.letter,
      rank: letterRank(first),
      digits: NO_DIGITS,
    };
  }
  if (isHanCharacter(first)) {
    return startOfHan(first);
  }
  return {
    group: NAME_START_GROUP.symbol,
    rank: first.codePointAt(0) ?? 0,
    digits: NO_DIGITS,
  };
}
