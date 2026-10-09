import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";
import type { EntrySummary } from "@shared/entries/entry-types";
import { selectVisibleEntries } from "@shared/entries/visible-entries";
import { tagIdsOrOmitted } from "@shared/tags/tag-filter";

import { selectEntry, type EntryStoreAccess } from "./entry-store-actions";
import { selectedIdOf, type EntrySelection } from "./entry-state";

/**
 * 在批量操作之前的可见列表里, 找批量操作之后详情要换成的相邻条目: 取原位置之后第一个仍然可见的,
 * 没有就取原位置之前最近的仍然可见的.
 * @param visibleBefore 批量操作之前当前可见的条目列表.
 * @param id 详情里的条目编号.
 * @param survivingIds 批量操作之后仍然可见的条目编号.
 * @returns 相邻条目, 没有任何仍可见的条目时为 undefined.
 */
export function findSurvivingNeighbour(
  visibleBefore: readonly EntrySummary[],
  id: string,
  survivingIds: ReadonlySet<string>,
): EntrySummary | undefined {
  const index = visibleBefore.findIndex((entry) => entry.id === id);
  const following = visibleBefore
    .slice(index + 1)
    .find((entry) => survivingIds.has(entry.id));
  return (
    following ??
    visibleBefore
      .slice(0, Math.max(index, 0))
      .reverse()
      .find((entry) => survivingIds.has(entry.id))
  );
}

/**
 * 选中的条目详情已读取完成时, 把详情里的所属文件夹与标签换成条目摘要里的新值, 其它状态原样返回.
 * @param selection 当前选中状态.
 * @param summary 批量操作之后详情里条目的摘要.
 * @returns 更新后的选中状态.
 */
function withSummaryFields(
  selection: EntrySelection,
  summary: EntrySummary,
): EntrySelection {
  return selection.status === "ready"
    ? {
        status: "ready",
        detail: {
          ...selection.detail,
          folderId: summary.folderId,
          tagIds: summary.tagIds,
        },
      }
    : selection;
}

/**
 * 用批量操作之后的条目列表替换 store 里的列表, 并按单个操作的规则处理详情: 详情里的条目被删除, 或
 * 原本在当前可见列表里而现在不在了, 就按当前入口与搜索关键字下的可见列表选中相邻条目并
 * 读取它的详情, 没有就回到没有选中的状态; 否则详情原样保留并同步新的文件夹与标签. 没有选中条目,
 * 或选中的条目没有被这次批量操作改动时, 详情不受影响, 直接换列表, 不去算可见列表 (条目很多时
 * 排序一遍要几百毫秒).
 * @param access store 动作能用到的东西.
 * @param nextEntries 批量操作之后的全部条目摘要.
 * @param affectedIds 被这次批量操作改动的条目编号.
 * @returns 相邻条目的详情读取完成后兑现.
 */
async function commitEntries(
  access: EntryStoreAccess,
  nextEntries: readonly EntrySummary[],
  affectedIds: ReadonlySet<string>,
): Promise<void> {
  const { entries, searchMatches, selection, view } = access.get();
  const selectedId = selectedIdOf(selection);
  if (selectedId === undefined || !affectedIds.has(selectedId)) {
    access.set({ entries: nextEntries });
    return;
  }
  const filters = { view, matches: searchMatches };
  const visibleBefore = selectVisibleEntries({ entries, ...filters });
  const survivingIds = new Set(
    selectVisibleEntries({ entries: nextEntries, ...filters }).map(
      (entry) => entry.id,
    ),
  );
  const own = nextEntries.find((entry) => entry.id === selectedId);
  const wasVisible = visibleBefore.some((entry) => entry.id === selectedId);
  const isLost =
    own === undefined || (wasVisible && !survivingIds.has(selectedId));
  if (!isLost) {
    access.set({
      entries: nextEntries,
      selection:
        own === undefined ? selection : withSummaryFields(selection, own),
    });
    return;
  }
  const neighbour = findSurvivingNeighbour(
    visibleBefore,
    selectedId,
    survivingIds,
  );
  access.set({
    entries: nextEntries,
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
 * 在内存里移除一批已被批量删除的条目. 主进程里的记录已由批量接口删除.
 * @param access store 动作能用到的东西.
 * @param ids 被删除的条目编号.
 * @returns 相邻条目的详情读取完成后兑现.
 */
export async function applyBatchRemoval(
  access: EntryStoreAccess,
  ids: readonly string[],
): Promise<void> {
  const removed = new Set(ids);
  await commitEntries(
    access,
    access.get().entries.filter((entry) => !removed.has(entry.id)),
    removed,
  );
}

/**
 * 在内存里把一批条目放进文件夹或移出文件夹. 主进程里的归属已由批量接口写入.
 * @param access store 动作能用到的东西.
 * @param ids 被移动的条目编号.
 * @param folderId 目标文件夹编号, 移出文件夹时为 undefined.
 * @returns 相邻条目的详情读取完成后兑现.
 */
export async function applyBatchFolder(
  access: EntryStoreAccess,
  ids: readonly string[],
  folderId: string | undefined,
): Promise<void> {
  const moved = new Set(ids);
  await commitEntries(
    access,
    access
      .get()
      .entries.map((entry) =>
        moved.has(entry.id) ? { ...entry, folderId } : entry,
      ),
    moved,
  );
}

/**
 * 在内存里把一批条目的标签换成批量接口返回的新标签. 主进程里的关联已由批量接口写入.
 * @param access store 动作能用到的东西.
 * @param assignments 受影响的条目现在带的标签.
 * @returns 相邻条目的详情读取完成后兑现.
 */
export async function applyBatchTags(
  access: EntryStoreAccess,
  assignments: readonly EntryTagAssignment[],
): Promise<void> {
  const tagIdsByEntry = new Map(
    assignments.map((assignment) => [assignment.entryId, assignment.tagIds]),
  );
  await commitEntries(
    access,
    access.get().entries.map((entry) => {
      const tagIds = tagIdsByEntry.get(entry.id);
      return tagIds === undefined
        ? entry
        : { ...entry, tagIds: tagIdsOrOmitted(tagIds) };
    }),
    new Set(tagIdsByEntry.keys()),
  );
}
