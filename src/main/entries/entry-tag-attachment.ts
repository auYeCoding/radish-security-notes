import type { EntrySummary } from "@shared/entries/entry-types";

/**
 * 给条目摘要补上各自带的标签编号, 没有标签的条目保持原样.
 * @param summaries 条目摘要.
 * @param tagIdsByEntry 条目编号到标签编号列表的映射.
 * @returns 带标签编号的条目摘要, 顺序不变.
 */
export function attachTagIds(
  summaries: readonly EntrySummary[],
  tagIdsByEntry: ReadonlyMap<string, readonly string[]>,
): EntrySummary[] {
  return summaries.map((summary) => {
    const tagIds = tagIdsByEntry.get(summary.id);
    return tagIds === undefined ? summary : { ...summary, tagIds };
  });
}
