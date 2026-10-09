import type { EntrySummary } from "../entries/entry-types";

/**
 * 一次需要执行的整批放入: 把哪些条目放进哪个文件夹.
 */
export interface BatchDrop {
  /**
   * 要移动的条目编号, 不含已经在目标里的条目.
   */
  readonly entryIds: readonly string[];
  /**
   * 目标文件夹编号.
   */
  readonly folderId: string;
}

/**
 * 取出拖拽一个条目时一起被拖走的整批条目: 被拖的条目已勾选时, 是已勾选的全部条目 (勾选总是跟随
 * 当前可见列表, 已不可见的条目已被取消勾选, 所以它们都是可见的); 没有勾选时只拖这一个条目, 不
 * 属于整批.
 * @param checked 已勾选的条目编号.
 * @param sourceId 被拖拽的条目编号.
 * @returns 整批条目的编号, 被拖的条目没有勾选时为 undefined.
 */
export function batchOfDragSource(
  checked: ReadonlySet<string>,
  sourceId: string,
): readonly string[] | undefined {
  return checked.has(sourceId) ? Array.from(checked) : undefined;
}

/**
 * 判定把一批已勾选的条目放在放置目标上要执行什么: 已经在目标文件夹里的条目不用移动, 都不用
 * 移动时什么都不用做.
 * @param entries 全部条目摘要.
 * @param entryIds 被整批拖拽的条目编号.
 * @param targetId 放置目标的编号, 即目标文件夹的编号.
 * @returns 需要执行的整批放入, 什么都不用做时为 undefined.
 */
export function resolveBatchDrop(
  entries: readonly EntrySummary[],
  entryIds: readonly string[],
  targetId: string,
): BatchDrop | undefined {
  const dragged = new Set(entryIds);
  const movable = entries
    .filter((entry) => dragged.has(entry.id) && entry.folderId !== targetId)
    .map((entry) => entry.id);
  return movable.length === 0
    ? undefined
    : { entryIds: movable, folderId: targetId };
}
