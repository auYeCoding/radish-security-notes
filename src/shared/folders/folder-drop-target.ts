import type { EntrySummary } from "../entries/entry-types";

/**
 * 一次需要执行的放入: 把哪个条目放进哪个文件夹.
 */
export interface EntryDrop {
  /**
   * 要移动的条目编号.
   */
  readonly entryId: string;
  /**
   * 目标文件夹编号.
   */
  readonly folderId: string;
}

/**
 * 判定把拖拽源放在放置目标上要执行什么: 条目不存在, 或已经在目标文件夹里时什么都不用做.
 * @param entries 全部条目摘要.
 * @param sourceId 被拖拽的条目编号.
 * @param targetId 放置目标的编号, 即目标文件夹的编号.
 * @returns 需要执行的放入, 什么都不用做时为 undefined.
 */
export function resolveEntryDrop(
  entries: readonly EntrySummary[],
  sourceId: string,
  targetId: string,
): EntryDrop | undefined {
  const entry = entries.find((candidate) => candidate.id === sourceId);
  if (entry === undefined || entry.folderId === targetId) {
    return undefined;
  }
  return { entryId: sourceId, folderId: targetId };
}
