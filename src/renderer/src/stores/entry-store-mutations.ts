import { entryFailed, type EntryResult } from "@shared/entries/entry-result";
import {
  toEntrySummary,
  type EntryDetail,
  type EntrySummary,
  type UpdateEntryInput,
} from "@shared/entries/entry-types";
import { filterEntries } from "@shared/entries/filter-entries";
import { entriesInView, followEntryView } from "@shared/folders/folder-view";

import { selectEntry, type EntryStoreAccess } from "./entry-store-actions";
import { selectedIdOf } from "./entry-state";

/**
 * 在列表里找删除某个条目后要选中的相邻条目: 原位置的下一项, 没有下一项就取上一项.
 * @param visible 删除前当前可见的条目列表.
 * @param id 要删除的条目编号.
 * @returns 相邻条目, 列表里没有别的条目时为 undefined.
 */
export function findNeighbour(
  visible: readonly EntrySummary[],
  id: string,
): EntrySummary | undefined {
  const index = visible.findIndex((entry) => entry.id === id);
  return visible[index + 1] ?? visible[index - 1];
}

/**
 * 更新一个条目. 成功后列表里该条目的摘要原位换成新值, 正在显示它的详情换成新详情, 编辑次数加
 * 一让详情视图重新挂载; 条目改到别的文件夹而不再属于当前入口时, 入口跟随条目切到它新所属的文件夹;
 * 搜索关键字与列表顺序不动.
 * @param access store 动作能用到的东西.
 * @param id 条目编号.
 * @param input 用户填写的名称, 类型字段, 备注, 自定义字段与 TOTP 的处理方式.
 * @returns 更新结果, 接口调用抛出错误时为意外错误.
 */
export async function updateEntry(
  access: EntryStoreAccess,
  id: string,
  input: UpdateEntryInput,
): Promise<EntryResult<EntryDetail>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.update(id, input);
    if (result.ok) {
      const detail = result.value;
      const state = get();
      set({
        entries: state.entries.map((entry) =>
          entry.id === detail.id ? toEntrySummary(detail) : entry,
        ),
        selection:
          selectedIdOf(state.selection) === detail.id
            ? { status: "ready", detail }
            : state.selection,
        detailRevision: state.detailRevision + 1,
        view: followEntryView(state.view, detail.folderId),
      });
    }
    return result;
  } catch {
    return entryFailed("unexpected-error");
  }
}

/**
 * 删除一个条目. 成功后条目从列表移除; 删除的是当前选中的条目时, 按当前入口与搜索关键字下的可见列表选中相邻条目并
 * 读取它的详情, 没有别的条目时回到没有选中的状态.
 * @param access store 动作能用到的东西.
 * @param id 条目编号.
 * @returns 删除结果, 接口调用抛出错误时为意外错误.
 */
export async function removeEntry(
  access: EntryStoreAccess,
  id: string,
): Promise<EntryResult<undefined>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.remove(id);
    if (!result.ok) {
      return result;
    }
    const { entries, query, selection, view } = get();
    const visible = filterEntries(entriesInView(entries, view), query);
    const neighbour = findNeighbour(visible, id);
    const remaining = entries.filter((entry) => entry.id !== id);
    if (selectedIdOf(selection) !== id) {
      set({ entries: remaining });
      return result;
    }
    set({
      entries: remaining,
      selection:
        neighbour === undefined
          ? { status: "none" }
          : { status: "loading", id: neighbour.id },
    });
    if (neighbour !== undefined) {
      await selectEntry(access, neighbour.id);
    }
    return result;
  } catch {
    return entryFailed("unexpected-error");
  }
}
