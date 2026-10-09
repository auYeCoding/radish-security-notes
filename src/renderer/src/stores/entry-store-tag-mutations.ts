import type { EntrySummary } from "@shared/entries/entry-types";
import { entryTagIdsOf, tagIdsOrOmitted } from "@shared/tags/tag-filter";

import type { EntryStoreAccess } from "./entry-store-actions";
import type { EntrySelection } from "./entry-state";

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
 * 在内存里释放一个已被删除的标签: 条目上带的它被摘掉, 选中的条目详情同步更新. 主进程里的关联已由
 * 删除标签的接口清除.
 * @param access store 动作能用到的东西.
 * @param tagId 被删除的标签编号.
 */
export function releaseTag(access: EntryStoreAccess, tagId: string): void {
  const { entries, selection } = access.get();
  access.set({
    entries: entries.map((entry) => withoutTagOnEntry(entry, tagId)),
    selection: withoutTagOnSelection(selection, tagId),
  });
}
