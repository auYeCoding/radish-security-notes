import type { EntrySummary } from "../entries/entry-types";

/**
 * 条目没有标签时用的空列表, 引用固定, 方便比较与复用.
 */
const NO_TAG_IDS: readonly string[] = [];

/**
 * 把标签编号列表换成条目摘要与详情里记录的形式: 没有标签时省略这一项.
 * @param tagIds 条目带的标签编号, 按选择顺序排列.
 * @returns 有标签时是编号列表, 没有标签时为 undefined.
 */
export function tagIdsOrOmitted(
  tagIds: readonly string[],
): readonly string[] | undefined {
  return tagIds.length > 0 ? tagIds : undefined;
}

/**
 * 取出条目带的标签编号, 没有标签时是空列表.
 * @param entry 条目摘要.
 * @returns 标签编号, 按条目上的选择顺序排列.
 */
export function entryTagIdsOf(
  entry: Pick<EntrySummary, "tagIds">,
): readonly string[] {
  return entry.tagIds ?? NO_TAG_IDS;
}

/**
 * 统计带某个标签的条目个数.
 * @param entries 全部条目摘要.
 * @param tagId 标签编号.
 * @returns 条目个数.
 */
export function countEntriesWithTag(
  entries: readonly EntrySummary[],
  tagId: string,
): number {
  return entries.filter((entry) => entryTagIdsOf(entry).includes(tagId)).length;
}

/**
 * 从标签编号列表里去掉一个标签, 例如标签被删除之后条目要摘掉它.
 * @param tagIds 当前的标签编号.
 * @param tagId 要去掉的标签编号.
 * @returns 去掉之后的标签编号, 本来就没有这个标签时返回原数组.
 */
export function withoutTagId(
  tagIds: readonly string[],
  tagId: string,
): readonly string[] {
  return tagIds.includes(tagId) ? tagIds.filter((id) => id !== tagId) : tagIds;
}
