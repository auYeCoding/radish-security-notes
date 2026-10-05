import { useMemo } from "react";

import { useBatchSelectionStore } from "@renderer/stores/use-batch-selection-store";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useVisibleEntries } from "@renderer/stores/use-visible-entries";

/**
 * 渲染端知道的三种范围里的条目: 全部条目的个数, 当前列表与已勾选的条目编号.
 */
export interface ExportScopeIds {
  /**
   * 全部条目的个数.
   */
  readonly allCount: number;
  /**
   * 当前列表里的条目编号: 左侧栏所选文件夹与标签, 搜索框筛出的条目, 按列表里的先后排列.
   */
  readonly currentIds: readonly string[];
  /**
   * 已勾选的条目编号.
   */
  readonly checkedIds: readonly string[];
}

/**
 * 读取三种导出范围里的条目: 全部条目的个数, 当前列表与已勾选的条目编号. 渲染端只取编号, 条目内容
 * 仍由主进程读取. 条目与筛选不变时返回值的引用不变.
 * @returns 三种范围里的条目.
 */
export function useExportScopeIds(): ExportScopeIds {
  const entries = useEntryStore((state) => state.entries);
  const visibleEntries = useVisibleEntries();
  const checkedIds = useBatchSelectionStore((state) => state.checkedIds);
  return useMemo(
    () => ({
      allCount: entries.length,
      currentIds: visibleEntries.map((entry) => entry.id),
      checkedIds: [...checkedIds],
    }),
    [entries, visibleEntries, checkedIds],
  );
}
