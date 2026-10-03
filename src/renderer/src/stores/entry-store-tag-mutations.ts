import type { EntrySummary } from "@shared/entries/entry-types";
import {
  entryTagIdsOf,
  hasAllTags,
  tagIdsOrOmitted,
  toggleTagId,
  withoutTagId,
} from "@shared/tags/tag-filter";

import type { EntryStoreAccess } from "./entry-store-actions";
import { selectedIdOf, type EntrySelection } from "./entry-state";

/**
 * 去掉条目摘要上带的某个标签, 条目没有这个标签时原样返回.
 * @param entry 条目摘要.
 * @param tagId 要去掉的标签编号.
 * @returns 去掉标签之后的条目摘要.
 */
function withoutTagOnEntry(entry: EntrySummary, tagId: string): EntrySummary {
  const own = entryTagIdsOf(entry);
  if (!own.includes(tagId)) {
    return entry;
  }
  return {
    ...entry,
    tagIds: tagIdsOrOmitted(own.filter((id) => id !== tagId)),
  };
}

/**
 * 选中的条目详情已读取完成时, 去掉详情里带的某个标签, 其它状态原样返回.
 * @param selection 当前选中状态.
 * @param tagId 要去掉的标签编号.
 * @returns 更新后的选中状态.
 */
function withoutTagOnSelection(
  selection: EntrySelection,
  tagId: string,
): EntrySelection {
  if (selection.status !== "ready") {
    return selection;
  }
  const own = entryTagIdsOf(selection.detail);
  return own.includes(tagId)
    ? {
        status: "ready",
        detail: {
          ...selection.detail,
          tagIds: tagIdsOrOmitted(own.filter((id) => id !== tagId)),
        },
      }
    : selection;
}

/**
 * 切换左侧栏里一个标签的选中状态. 当前选中的条目不再满足全部已选标签时回到没有选中的状态,
 * 让详情里不会显示列表之外的条目; 文件夹入口与搜索关键字保留.
 * @param access store 动作能用到的东西.
 * @param tagId 被点击的标签编号.
 */
export function toggleTag(access: EntryStoreAccess, tagId: string): void {
  const { entries, selection, selectedTagIds } = access.get();
  const nextTagIds = toggleTagId(selectedTagIds, tagId);
  const selectedId = selectedIdOf(selection);
  const selected = entries.find((entry) => entry.id === selectedId);
  const isSelectionKept =
    selectedId === undefined ||
    (selected !== undefined && hasAllTags(selected, nextTagIds));
  access.set(
    isSelectionKept
      ? { selectedTagIds: nextTagIds }
      : { selectedTagIds: nextTagIds, selection: { status: "none" } },
  );
}

/**
 * 在内存里释放一个已被删除的标签: 条目上带的它被摘掉, 已选标签里的它被去掉, 选中的条目详情
 * 同步更新. 主进程里的关联已由删除标签的接口清除.
 * @param access store 动作能用到的东西.
 * @param tagId 被删除的标签编号.
 */
export function releaseTag(access: EntryStoreAccess, tagId: string): void {
  const { entries, selection, selectedTagIds } = access.get();
  access.set({
    entries: entries.map((entry) => withoutTagOnEntry(entry, tagId)),
    selection: withoutTagOnSelection(selection, tagId),
    selectedTagIds: withoutTagId(selectedTagIds, tagId),
  });
}
