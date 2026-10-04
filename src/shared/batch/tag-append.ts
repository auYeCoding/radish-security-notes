import { MAX_TAGS_PER_ENTRY } from "../tags/tag-limits";

/**
 * 判断条目再追加一个标签是否会超过标签数上限. 条目已带这个标签时追加不改变数量, 不算超限.
 * @param own 条目现在带的标签编号.
 * @param tagId 要追加的标签编号.
 * @returns 追加后会超过上限时返回 true.
 */
export function wouldExceedTagLimit(
  own: readonly string[],
  tagId: string,
): boolean {
  return !own.includes(tagId) && own.length >= MAX_TAGS_PER_ENTRY;
}

/**
 * 给条目的标签追加一个标签: 追加在末尾, 条目已带它时原样返回.
 * @param own 条目现在带的标签编号, 按选择顺序排列.
 * @param tagId 要追加的标签编号.
 * @returns 追加之后的标签编号.
 */
export function appendTagId(
  own: readonly string[],
  tagId: string,
): readonly string[] {
  return own.includes(tagId) ? own : [...own, tagId];
}
