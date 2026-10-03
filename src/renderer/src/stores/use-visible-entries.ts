import { useMemo } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";
import { selectVisibleEntries } from "@shared/entries/visible-entries";

import { useEntryStore } from "./use-entry-store";

/**
 * 读取当前可见的条目列表: 先取属于左侧栏所选文件夹入口的条目, 再留下带全部已选标签的, 最后在其中
 * 按搜索关键字过滤. 过滤结果用 `useMemo` 缓存, 条目, 入口, 已选标签与关键字不变时引用不变,
 * 避免无谓的重新渲染.
 * @returns 当前入口与标签下名称或账号匹配关键字的条目摘要, 关键字为空时是入口与标签筛出的全部条目.
 */
export function useVisibleEntries(): readonly EntrySummary[] {
  const entries = useEntryStore((state) => state.entries);
  const view = useEntryStore((state) => state.view);
  const tagIds = useEntryStore((state) => state.selectedTagIds);
  const query = useEntryStore((state) => state.query);
  return useMemo(
    () => selectVisibleEntries({ entries, view, tagIds, query }),
    [entries, view, tagIds, query],
  );
}
