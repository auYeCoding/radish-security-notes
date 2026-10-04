import type { FoldedText } from "./fold-text";

/**
 * 原文里的一段区间, 以 UTF-16 下标计, 含起点不含终点.
 */
export interface TextRange {
  /**
   * 区间起点.
   */
  readonly start: number;
  /**
   * 区间终点, 不含.
   */
  readonly end: number;
}

/**
 * 找出一个词在规范化文本里的全部不重叠出现处, 并映射回原文的区间.
 * @param source 带原位置的规范化文本.
 * @param term 规范化后的关键字词.
 * @returns 原文里的命中区间, 按先后排列; 词为空时为空数组.
 */
export function findTermRanges(
  source: FoldedText,
  term: string,
): readonly TextRange[] {
  if (term.length === 0) {
    return [];
  }
  const ranges: TextRange[] = [];
  for (
    let index = source.folded.indexOf(term);
    index >= 0;
    index = source.folded.indexOf(term, index + term.length)
  ) {
    ranges.push({
      start: source.starts[index],
      end: source.ends[index + term.length - 1],
    });
  }
  return ranges;
}
