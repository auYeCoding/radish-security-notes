import type { EntrySummary } from "../entries/entry-types";

/**
 * 全部条目入口.
 */
export interface AllEntriesView {
  /**
   * 入口种类.
   */
  readonly kind: "all";
}

/**
 * 某个文件夹的入口.
 */
export interface FolderEntriesView {
  /**
   * 入口种类.
   */
  readonly kind: "folder";
  /**
   * 文件夹编号.
   */
  readonly folderId: string;
}

/**
 * 左侧栏当前选中的入口, 决定中间列表显示哪些条目: 全部条目, 或某个文件夹里的条目.
 */
export type FolderView = AllEntriesView | FolderEntriesView;

/**
 * 全部条目入口.
 */
export const ALL_ENTRIES_VIEW: FolderView = { kind: "all" };

/**
 * 构造某个文件夹的入口.
 * @param folderId 文件夹编号.
 * @returns 该文件夹的入口.
 */
export function folderViewOf(folderId: string): FolderView {
  return { kind: "folder", folderId };
}

/**
 * 构造条目所属位置对应的入口: 有所属文件夹时是该文件夹, 否则是全部条目.
 * @param folderId 条目所属文件夹的编号, 没有所属文件夹时为 undefined.
 * @returns 对应的入口.
 */
export function viewOfFolderId(folderId: string | undefined): FolderView {
  return folderId === undefined ? ALL_ENTRIES_VIEW : folderViewOf(folderId);
}

/**
 * 取出入口对应的文件夹编号, 用作新建条目时默认所属的文件夹.
 * @param view 入口.
 * @returns 入口是某个文件夹时为它的编号, 全部条目入口为 undefined.
 */
export function folderIdOfView(view: FolderView): string | undefined {
  return view.kind === "folder" ? view.folderId : undefined;
}

/**
 * 判断两个入口是否相同.
 * @param first 第一个入口.
 * @param second 第二个入口.
 * @returns 相同时返回 true.
 */
export function isSameView(first: FolderView, second: FolderView): boolean {
  if (first.kind !== second.kind) {
    return false;
  }
  return (
    first.kind !== "folder" ||
    (second.kind === "folder" && first.folderId === second.folderId)
  );
}

/**
 * 判断条目是否属于某个入口.
 * @param entry 条目摘要.
 * @param view 入口.
 * @returns 属于时返回 true.
 */
export function isEntryInView(
  entry: Pick<EntrySummary, "folderId">,
  view: FolderView,
): boolean {
  switch (view.kind) {
    case "all":
      return true;
    default:
      return entry.folderId === view.folderId;
  }
}

/**
 * 取出属于某个入口的条目, 保持原有顺序.
 * @param entries 全部条目摘要.
 * @param view 入口.
 * @returns 属于该入口的条目摘要, 入口是全部条目时返回原数组.
 */
export function entriesInView(
  entries: readonly EntrySummary[],
  view: FolderView,
): readonly EntrySummary[] {
  if (view.kind === "all") {
    return entries;
  }
  return entries.filter((entry) => isEntryInView(entry, view));
}

/**
 * 统计属于某个入口的条目个数.
 * @param entries 全部条目摘要.
 * @param view 入口.
 * @returns 条目个数.
 */
export function countEntriesInView(
  entries: readonly EntrySummary[],
  view: FolderView,
): number {
  return entriesInView(entries, view).length;
}

/**
 * 条目保存到某个文件夹后, 让入口跟随条目: 当前入口是全部条目, 或条目仍属于当前入口时不变;
 * 否则切到条目新所属的入口, 没有所属文件夹时是全部条目入口.
 * @param view 保存前的入口.
 * @param folderId 条目保存后所属文件夹的编号, 没有所属文件夹时为 undefined.
 * @returns 保存后应显示的入口.
 */
export function followEntryView(
  view: FolderView,
  folderId: string | undefined,
): FolderView {
  return isEntryInView({ folderId }, view) ? view : viewOfFolderId(folderId);
}
