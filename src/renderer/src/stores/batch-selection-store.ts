import {
  checkAllVisible,
  checkRange,
  invertChecked,
  retainVisibleChecked,
  selectAllStateOf,
  toggleChecked,
  uncheckAllVisible,
} from "@shared/batch/batch-selection";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  INITIAL_BATCH_SELECTION_STATE,
  type BatchSelectionState,
} from "./batch-selection-state";

/**
 * 批量选中动作: 切换, 连选, 全选, 反选, 取消不可见条目的选中与清空. 凡是要看当前可见列表的动作
 * 都由调用方传入可见条目编号, store 自己不读条目 store.
 */
export interface BatchSelectionActions {
  /**
   * 切换一个条目的勾选状态, 并把它记为连选区间的起点.
   * @param id 条目编号.
   */
  toggle: (id: string) => void;
  /**
   * 勾选区间起点与目标之间的全部可见条目, 并入已有的勾选; 区间起点不在可见列表里时只勾选目标,
   * 并把目标记为起点.
   * @param visibleIds 当前可见的条目编号, 按显示顺序排列.
   * @param id 被点击的条目编号.
   */
  checkRangeTo: (visibleIds: readonly string[], id: string) => void;
  /**
   * 切换全选: 可见条目已经全部勾选时取消它们的勾选, 否则勾选全部可见条目.
   * @param visibleIds 当前可见的条目编号.
   */
  toggleAll: (visibleIds: readonly string[]) => void;
  /**
   * 在可见条目里反选.
   * @param visibleIds 当前可见的条目编号.
   */
  invert: (visibleIds: readonly string[]) => void;
  /**
   * 取消已不可见条目的勾选, 仍可见的保留; 没有变化时不更新状态.
   * @param visibleIds 当前可见的条目编号.
   */
  retain: (visibleIds: readonly string[]) => void;
  /**
   * 清空全部勾选.
   */
  clear: () => void;
}

/**
 * 批量选中 store 的完整形状.
 */
export type BatchSelectionStore = StoreApi<
  BatchSelectionState & BatchSelectionActions
>;

/**
 * 创建批量选中 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @returns 批量选中 store.
 */
export function createBatchSelectionStore(): BatchSelectionStore {
  return createStore<BatchSelectionState & BatchSelectionActions>()(
    (set, get) => ({
      ...INITIAL_BATCH_SELECTION_STATE,
      toggle: (id) =>
        set({ checkedIds: toggleChecked(get().checkedIds, id), anchorId: id }),
      checkRangeTo: (visibleIds, id) => {
        const { checkedIds, anchorId } = get();
        const isAnchorVisible =
          anchorId !== undefined && visibleIds.includes(anchorId);
        set({
          checkedIds: checkRange(checkedIds, visibleIds, anchorId, id),
          anchorId: isAnchorVisible ? anchorId : id,
        });
      },
      toggleAll: (visibleIds) => {
        const { checkedIds } = get();
        set({
          checkedIds:
            selectAllStateOf(checkedIds, visibleIds) === "all"
              ? uncheckAllVisible(checkedIds, visibleIds)
              : checkAllVisible(checkedIds, visibleIds),
        });
      },
      invert: (visibleIds) =>
        set({ checkedIds: invertChecked(get().checkedIds, visibleIds) }),
      retain: (visibleIds) => {
        const { checkedIds, anchorId } = get();
        const retained = retainVisibleChecked(checkedIds, visibleIds);
        if (retained !== checkedIds) {
          set({
            checkedIds: retained,
            anchorId:
              anchorId !== undefined && retained.has(anchorId)
                ? anchorId
                : undefined,
          });
        }
      },
      clear: () => set(INITIAL_BATCH_SELECTION_STATE),
    }),
  );
}
