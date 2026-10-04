import { useMemo } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";
import { selectVisibleEntries } from "@shared/entries/visible-entries";

import { useEntryStore } from "./use-entry-store";

/**
 * 读取当前可见的条目列表: 先取属于左侧栏所选文件夹入口的条目, 再留下带全部已选标签的, 然后在其中
 * 留下搜索命中的, 最后按名称排序规则排序 (纯英文, 中英混杂, 纯中文三类, 类内先比名称长度再比首字母,
 * 名称排序键相同的保持 store 里的创建顺序). 结果用 `useMemo` 缓存, 条目, 入口, 已选标签与搜索命中表
 * 不变时引用不变, 避免无谓的重新渲染与重复排序.
 * @returns 当前入口与标签下搜索命中的条目摘要, 已按名称排序, 没有搜索结果时是入口与标签筛出的
 * 全部条目.
 */
export function useVisibleEntries(): readonly EntrySummary[] {
  const entries = useEntryStore((state) => state.entries);
  const view = useEntryStore((state) => state.view);
  const tagIds = useEntryStore((state) => state.selectedTagIds);
  const matches = useEntryStore((state) => state.searchMatches);
  return useMemo(
    () => selectVisibleEntries({ entries, view, tagIds, matches }),
    [entries, view, tagIds, matches],
  );
}
