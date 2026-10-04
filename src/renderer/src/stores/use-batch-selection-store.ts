import { useContext } from "react";
import { useStore } from "zustand";

import type { BatchSelectionState } from "./batch-selection-state";
import type {
  BatchSelectionActions,
  BatchSelectionStore,
} from "./batch-selection-store";
import { BatchSelectionStoreContext } from "./batch-selection-store-context";

/**
 * 取出批量选中 store 本身, 供只在事件发生时读取勾选的组件使用: 读取不订阅, 勾选变化不会让组件
 * 重新渲染.
 * @returns 批量选中 store.
 * @throws Error 组件不在 BatchSelectionStoreProvider 内时.
 */
export function useBatchSelectionStoreApi(): BatchSelectionStore {
  const store = useContext(BatchSelectionStoreContext);
  if (store === undefined) {
    throw new Error(
      "useBatchSelectionStore 必须在 BatchSelectionStoreProvider 内使用",
    );
  }
  return store;
}

/**
 * 读取批量选中 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 BatchSelectionStoreProvider 内时.
 */
export function useBatchSelectionStore<Selected>(
  selector: (state: BatchSelectionState & BatchSelectionActions) => Selected,
): Selected {
  return useStore(useBatchSelectionStoreApi(), selector);
}
