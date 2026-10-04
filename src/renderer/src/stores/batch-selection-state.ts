import { NO_CHECKED_IDS } from "@shared/batch/batch-selection";

/**
 * 批量选中 store 的状态.
 */
export interface BatchSelectionState {
  /**
   * 已勾选的条目编号. 与条目 store 里单击选中查看详情的条目互相独立; 只在内存里, 不持久化.
   */
  readonly checkedIds: ReadonlySet<string>;
  /**
   * Shift 加点击连选区间的起点, 是最近一次勾选或切换的条目, 没有时为 undefined.
   */
  readonly anchorId: string | undefined;
}

/**
 * 批量选中 store 的初始状态: 没有勾选任何条目, 没有区间起点.
 */
export const INITIAL_BATCH_SELECTION_STATE: BatchSelectionState = {
  checkedIds: NO_CHECKED_IDS,
  anchorId: undefined,
};
