import type { EntrySummary } from "@shared/entries/entry-types";
import { selectVisibleEntries } from "@shared/entries/visible-entries";
import {
  ALL_ENTRIES_VIEW,
  isEntryInView,
  type FolderView,
} from "@shared/folders/folder-view";

import { selectEntry, type EntryStoreAccess } from "./entry-store-actions";
import { findNeighbour } from "./entry-store-mutations";
import { selectedIdOf, type EntrySelection } from "./entry-state";

/**
 * 选中的条目详情已读取完成时, 把详情里的所属文件夹换成新值, 其它状态原样返回.
 * @param selection 当前选中状态.
 * @param folderId 新的所属文件夹编号, 未分类时为 undefined.
 * @returns 更新后的选中状态.
 */
function withSelectedFolder(
  selection: EntrySelection,
  folderId: string | undefined,
): EntrySelection {
  return selection.status === "ready"
    ? { status: "ready", detail: { ...selection.detail, folderId } }
    : selection;
}

/**
 * 切换左侧栏入口. 当前选中的条目不属于新入口时回到没有选中的状态, 让详情里不会显示列表之外的
 * 条目; 搜索关键字保留, 在新入口里继续过滤.
 * @param access store 动作能用到的东西.
 * @param view 要切换到的入口.
 */
export function selectView(access: EntryStoreAccess, view: FolderView): void {
  const { entries, selection } = access.get();
  const selectedId = selectedIdOf(selection);
  const selected = entries.find((entry) => entry.id === selectedId);
  const isSelectionKept =
    selectedId === undefined ||
    (selected !== undefined && isEntryInView(selected, view));
  access.set(
    isSelectionKept ? { view } : { view, selection: { status: "none" } },
  );
}

/**
 * 在内存里把一个条目放进文件夹或移回未分类, 入口保持不动. 条目因此不再属于当前入口且正被选中时,
 * 按当前可见列表 (入口, 已选标签与搜索关键字) 选中相邻条目并读取它的详情, 没有别的条目时回到没有选中的状态; 入口是全部条目
 * 时条目仍留在列表里. 主进程里的归属由文件夹接口另行写入.
 * @param access store 动作能用到的东西.
 * @param entryId 条目编号.
 * @param folderId 目标文件夹编号, 未分类时为 undefined.
 * @returns 相邻条目的详情读取完成后兑现.
 */
export async function applyEntryFolder(
  access: EntryStoreAccess,
  entryId: string,
  folderId: string | undefined,
): Promise<void> {
  const { entries, searchMatches, selection, selectedTagIds, view } =
    access.get();
  const moved = entries.map((entry) =>
    entry.id === entryId ? { ...entry, folderId } : entry,
  );
  const isSelected = selectedIdOf(selection) === entryId;
  if (!isSelected) {
    access.set({ entries: moved });
    return;
  }
  if (isEntryInView({ folderId }, view)) {
    access.set({
      entries: moved,
      selection: withSelectedFolder(selection, folderId),
    });
    return;
  }
  const visible = selectVisibleEntries({
    entries,
    view,
    tagIds: selectedTagIds,
    matches: searchMatches,
  });
  const neighbour: EntrySummary | undefined = findNeighbour(visible, entryId);
  access.set({
    entries: moved,
    selection:
      neighbour === undefined
        ? { status: "none" }
        : { status: "loading", id: neighbour.id },
  });
  if (neighbour !== undefined) {
    await selectEntry(access, neighbour.id);
  }
}

/**
 * 在内存里释放一个已被删除的文件夹: 其中条目的所属清空, 回到未分类; 当前入口正是这个文件夹时
 * 回到全部条目. 主进程里的归属已由删除文件夹的接口清空.
 * @param access store 动作能用到的东西.
 * @param folderId 被删除的文件夹编号.
 */
export function releaseFolder(
  access: EntryStoreAccess,
  folderId: string,
): void {
  const { entries, selection, view } = access.get();
  const isViewReleased = view.kind === "folder" && view.folderId === folderId;
  const isSelectionAffected =
    selection.status === "ready" && selection.detail.folderId === folderId;
  access.set({
    entries: entries.map((entry) =>
      entry.folderId === folderId ? { ...entry, folderId: undefined } : entry,
    ),
    selection: isSelectionAffected
      ? withSelectedFolder(selection, undefined)
      : selection,
    view: isViewReleased ? ALL_ENTRIES_VIEW : view,
  });
}
