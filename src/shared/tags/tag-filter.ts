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
 * 判断条目是否带全部给定的标签.
 * @param entry 条目摘要.
 * @param tagIds 要求条目带上的标签编号, 为空时任何条目都满足.
 * @returns 条目带全部这些标签时返回 true.
 */
export function hasAllTags(
  entry: Pick<EntrySummary, "tagIds">,
  tagIds: readonly string[],
): boolean {
  const own = entryTagIdsOf(entry);
  return tagIds.every((tagId) => own.includes(tagId));
}

/**
 * 取出带全部给定标签的条目, 保持原有顺序.
 * @param entries 条目摘要.
 * @param tagIds 已选标签编号.
 * @returns 带全部这些标签的条目摘要, 没有已选标签时返回原数组.
 */
export function entriesWithAllTags(
  entries: readonly EntrySummary[],
  tagIds: readonly string[],
): readonly EntrySummary[] {
  if (tagIds.length === 0) {
    return entries;
  }
  return entries.filter((entry) => hasAllTags(entry, tagIds));
}

/**
 * 统计带某个标签的条目个数, 不随别的筛选变化.
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
 * 切换一个标签的选中状态: 已选中则取消, 否则追加在末尾.
 * @param selectedTagIds 当前已选标签编号.
 * @param tagId 被点击的标签编号.
 * @returns 新的已选标签编号.
 */
export function toggleTagId(
  selectedTagIds: readonly string[],
  tagId: string,
): readonly string[] {
  return selectedTagIds.includes(tagId)
    ? selectedTagIds.filter((id) => id !== tagId)
    : [...selectedTagIds, tagId];
}

/**
 * 从已选标签里去掉一个标签, 例如它被删除之后.
 * @param selectedTagIds 当前已选标签编号.
 * @param tagId 要去掉的标签编号.
 * @returns 去掉之后的已选标签编号, 本来就没选中时返回原数组.
 */
export function withoutTagId(
  selectedTagIds: readonly string[],
  tagId: string,
): readonly string[] {
  return selectedTagIds.includes(tagId)
    ? selectedTagIds.filter((id) => id !== tagId)
    : selectedTagIds;
}

/**
 * 条目保存后让已选标签跟随条目: 取消条目不再带的已选标签, 条目仍带的保持选中, 这样条目一定
 * 还满足标签筛选.
 * @param selectedTagIds 保存前的已选标签编号.
 * @param entryTagIds 条目保存后带的标签编号.
 * @returns 保存后应保持选中的标签编号, 没有变化时返回原数组.
 */
export function followEntryTags(
  selectedTagIds: readonly string[],
  entryTagIds: readonly string[] | undefined,
): readonly string[] {
  const own = entryTagIds ?? NO_TAG_IDS;
  const kept = selectedTagIds.filter((tagId) => own.includes(tagId));
  return kept.length === selectedTagIds.length ? selectedTagIds : kept;
}
