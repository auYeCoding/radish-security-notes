import type { EntrySummary } from "../entries/entry-types";
import { UNCATEGORIZED_KEY } from "./uncategorized-key";

/**
 * 一次需要执行的放入: 把哪个条目放进哪个文件夹.
 */
export interface EntryDrop {
  /**
   * 要移动的条目编号.
   */
  readonly entryId: string;
  /**
   * 目标文件夹编号, 移回未分类时为 undefined.
   */
  readonly folderId: string | undefined;
}

/**
 * 把放置目标的编号换成条目要放入的文件夹编号.
 * @param targetId 放置目标的编号, 是文件夹编号或 `UNCATEGORIZED_KEY`.
 * @returns 文件夹编号, 目标是未分类时为 undefined.
 */
export function folderIdFromDropTarget(targetId: string): string | undefined {
  return targetId === UNCATEGORIZED_KEY ? undefined : targetId;
}

/**
 * 判定把拖拽源放在放置目标上要执行什么: 条目不存在, 或已经在目标文件夹里时什么都不用做.
 * @param entries 全部条目摘要.
 * @param sourceId 被拖拽的条目编号.
 * @param targetId 放置目标的编号, 是文件夹编号或 `UNCATEGORIZED_KEY`.
 * @returns 需要执行的放入, 什么都不用做时为 undefined.
 */
export function resolveEntryDrop(
  entries: readonly EntrySummary[],
  sourceId: string,
  targetId: string,
): EntryDrop | undefined {
  const folderId = folderIdFromDropTarget(targetId);
  const entry = entries.find((candidate) => candidate.id === sourceId);
  if (entry === undefined || entry.folderId === folderId) {
    return undefined;
  }
  return { entryId: sourceId, folderId };
}
