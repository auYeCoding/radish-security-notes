import { useCallback } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";

import { useBatchSelectionStore } from "@renderer/stores/use-batch-selection-store";

/**
 * 列表里勾选相关的状态与回调.
 */
export interface EntryListChecking {
  /**
   * 已勾选的条目编号.
   */
  readonly checkedIds: ReadonlySet<string>;
  /**
   * 切换一个条目的勾选状态, 引用稳定.
   */
  readonly toggleChecked: (id: string) => void;
  /**
   * 勾选起点与一个条目之间的全部可见条目, 引用在可见条目不变时稳定.
   */
  readonly checkRange: (id: string) => void;
}

/**
 * 取得列表里勾选相关的状态与回调: 勾选状态来自批量选中 store, 连选区间按传入的可见条目顺序计算.
 * @param entries 当前可见的条目, 按显示顺序排列.
 * @returns 已勾选的条目编号与切换, 连选的回调.
 */
export function useEntryListChecking(
  entries: readonly EntrySummary[],
): EntryListChecking {
  const checkedIds = useBatchSelectionStore((state) => state.checkedIds);
  const toggleChecked = useBatchSelectionStore((state) => state.toggle);
  const checkRangeTo = useBatchSelectionStore((state) => state.checkRangeTo);
  const checkRange = useCallback(
    (id: string) =>
      checkRangeTo(
        entries.map((entry) => entry.id),
        id,
      ),
    [checkRangeTo, entries],
  );
  return { checkedIds, toggleChecked, checkRange };
}
