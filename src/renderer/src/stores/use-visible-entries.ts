import { useMemo } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";
import { filterEntries } from "@shared/entries/filter-entries";
import { entriesInView } from "@shared/folders/folder-view";

import { useEntryStore } from "./use-entry-store";

/**
 * 读取当前入口里按搜索关键字过滤后的条目列表: 先取属于左侧栏所选入口的条目, 再在其中按关键字
 * 过滤. 过滤结果用 `useMemo` 缓存, 条目, 入口与关键字不变时引用不变, 避免无谓的重新渲染.
 * @returns 当前入口里名称或账号匹配关键字的条目摘要, 关键字为空时是当前入口的全部条目.
 */
export function useVisibleEntries(): readonly EntrySummary[] {
  const entries = useEntryStore((state) => state.entries);
  const view = useEntryStore((state) => state.view);
  const query = useEntryStore((state) => state.query);
  return useMemo(
    () => filterEntries(entriesInView(entries, view), query),
    [entries, view, query],
  );
}
