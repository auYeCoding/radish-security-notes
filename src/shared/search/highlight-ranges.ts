import { findTermRanges, type TextRange } from "./find-term-ranges";
import { foldTextWithOrigins } from "./fold-text";
import { pinyinInitialsWithOrigins } from "./pinyin-initials";

/**
 * 高亮区间的计算选项.
 */
export interface HighlightOptions {
  /**
   * 是否也按拼音首字母算命中区间.
   */
  readonly withPinyin: boolean;
}

/**
 * 文本被高亮区间切开后的一段.
 */
export interface HighlightSegment {
  /**
   * 这一段的原文.
   */
  readonly text: string;
  /**
   * 这一段是否是命中处.
   */
  readonly isMatch: boolean;
}

/**
 * 把区间按起点排序并合并重叠或相接的区间.
 * @param ranges 未排序的区间.
 * @returns 排序合并后的区间.
 */
function mergeRanges(ranges: readonly TextRange[]): readonly TextRange[] {
  const sorted = [...ranges].sort(
    (first, second) => first.start - second.start,
  );
  const merged: TextRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end) {
      merged[merged.length - 1] = {
        start: last.start,
        end: Math.max(last.end, range.end),
      };
    } else {
      merged.push(range);
    }
  }
  return merged;
}

/**
 * 算出一段原文里要高亮的区间: 每个词在规范化文本里的命中处, 开启拼音时再加上在首字母串里的命中处.
 * @param text 原文.
 * @param terms 规范化后的关键字词.
 * @param options 是否按拼音首字母算命中.
 * @returns 排序合并后的命中区间.
 */
export function highlightRanges(
  text: string,
  terms: readonly string[],
  options: HighlightOptions,
): readonly TextRange[] {
  if (terms.length === 0) {
    return [];
  }
  const sources = options.withPinyin
    ? [foldTextWithOrigins(text), pinyinInitialsWithOrigins(text)]
    : [foldTextWithOrigins(text)];
  return mergeRanges(
    sources.flatMap((source) =>
      terms.flatMap((term) => findTermRanges(source, term)),
    ),
  );
}

/**
 * 按区间把原文切成命中与非命中的连续片段, 片段连起来等于原文.
 * @param text 原文.
 * @param ranges 排序合并后的命中区间.
 * @returns 片段列表, 原文为空时为空数组.
 */
export function splitByRanges(
  text: string,
  ranges: readonly TextRange[],
): readonly HighlightSegment[] {
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), isMatch: false });
    }
    segments.push({ text: text.slice(range.start, range.end), isMatch: true });
    cursor = range.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false });
  }
  return segments;
}
