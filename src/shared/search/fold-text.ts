/**
 * 匹配组合记号 (重音符号等), 规范化分解后用来去掉重音.
 */
const COMBINING_MARKS = /\p{M}/gu;

/**
 * 带原位置的规范化文本: 每个规范化后的字符记着它来自原文的哪一段, 用来把命中区间映射回原文.
 */
export interface FoldedText {
  /**
   * 规范化后的文本.
   */
  readonly folded: string;
  /**
   * 规范化文本里每个字符对应的原文起点, 与 `folded` 逐字符对应.
   */
  readonly starts: readonly number[];
  /**
   * 规范化文本里每个字符对应的原文终点 (不含), 与 `folded` 逐字符对应.
   */
  readonly ends: readonly number[];
}

/**
 * 把文本规范化用于比较: 先分解到兼容形式, 使全角字母与数字变成半角, 带重音的字母拆成字母加记号,
 * 兼容汉字变成统一汉字; 再去掉组合记号, 最后转成小写.
 * @param text 原文.
 * @returns 规范化后的文本.
 */
export function foldText(text: string): string {
  return text.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
}

/**
 * 逐个字符转换原文并记录每段转换结果对应的原位置.
 * @param text 原文.
 * @param convert 把一个字符转成要放进结果的文本.
 * @returns 转换后的文本与每个字符对应的原文区间.
 */
export function convertWithOrigins(
  text: string,
  convert: (character: string) => string,
): FoldedText {
  const starts: number[] = [];
  const ends: number[] = [];
  let folded = "";
  let offset = 0;
  for (const character of text) {
    const piece = convert(character);
    const end = offset + character.length;
    for (let index = 0; index < piece.length; index += 1) {
      starts.push(offset);
      ends.push(end);
    }
    folded += piece;
    offset = end;
  }
  return { folded, starts, ends };
}

/**
 * 规范化文本并记录每个字符对应的原位置, 结果的 `folded` 与 `foldText` 一致.
 * @param text 原文.
 * @returns 规范化后的文本与每个字符对应的原文区间.
 */
export function foldTextWithOrigins(text: string): FoldedText {
  return convertWithOrigins(text, foldText);
}
