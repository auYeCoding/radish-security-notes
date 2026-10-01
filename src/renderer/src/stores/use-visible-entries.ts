import { useMemo } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";
import { filterEntries } from "@shared/entries/filter-entries";

import { useEntryStore } from "./use-entry-store";

/**
 * 读取按搜索关键字过滤后的条目列表. 过滤结果用 `useMemo` 缓存, 条目与关键字不变时
 * 引用不变, 避免无谓的重新渲染.
 * @returns 名称或账号匹配关键字的条目摘要, 关键字为空时是全部条目.
 */
export function useVisibleEntries(): readonly EntrySummary[] {
  const entries = useEntryStore((state) => state.entries);
  const query = useEntryStore((state) => state.query);
  return useMemo(() => filterEntries(entries, query), [entries, query]);
}
