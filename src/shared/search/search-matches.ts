import type { EntrySummary } from "../entries/entry-types";
import type { EntrySearchHit, EntrySearchMatches } from "./entry-search-types";

/**
 * 把主进程返回的命中列表转成按条目编号查找的命中表.
 * @param hits 命中列表.
 * @returns 命中表.
 */
export function toSearchMatches(
  hits: readonly EntrySearchHit[],
): EntrySearchMatches {
  return new Map(hits.map((hit) => [hit.id, hit.fields]));
}

/**
 * 按命中表留下命中的条目, 保持原有顺序.
 * @param entries 条目摘要.
 * @param matches 命中表, 没有搜索时为 undefined.
 * @returns 命中表里有的条目摘要, 没有命中表时返回原数组.
 */
export function filterByMatches(
  entries: readonly EntrySummary[],
  matches: EntrySearchMatches | undefined,
): readonly EntrySummary[] {
  if (matches === undefined) {
    return entries;
  }
  return entries.filter((entry) => matches.has(entry.id));
}
