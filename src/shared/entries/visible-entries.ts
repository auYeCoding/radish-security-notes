import { entriesInView, type FolderView } from "../folders/folder-view";
import { sortByName } from "../name-sorting/sort-by-name";
import type { EntrySearchMatches } from "../search/entry-search-types";
import { filterByMatches } from "../search/search-matches";
import type { EntrySummary } from "./entry-types";

/**
 * 决定中间列表显示哪些条目的筛选条件.
 */
export interface EntryVisibility {
  /**
   * 全部条目摘要.
   */
  readonly entries: readonly EntrySummary[];
  /**
   * 左侧栏选中的文件夹入口.
   */
  readonly view: FolderView;
  /**
   * 搜索命中表, 只显示命中表里有的条目; 没有搜索关键字时为 undefined, 不按搜索筛选.
   */
  readonly matches: EntrySearchMatches | undefined;
}

/**
 * 取出当前可见的条目: 先取属于所选文件夹入口的条目, 再在其中留下搜索命中的, 最后按名称排序规则排序.
 * 名称排序键相同的条目保持传入数组里的先后, 所以传入的数组应是创建顺序 (新的在前).
 * @param visibility 条目与筛选条件.
 * @returns 可见的条目摘要, 已按名称排序.
 */
export function selectVisibleEntries(
  visibility: EntryVisibility,
): readonly EntrySummary[] {
  const inView = entriesInView(visibility.entries, visibility.view);
  return sortByName(filterByMatches(inView, visibility.matches));
}
