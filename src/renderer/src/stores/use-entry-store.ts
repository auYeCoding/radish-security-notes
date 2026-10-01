import { useContext } from "react";
import { useStore } from "zustand";

import { EntryStoreContext } from "./entry-store-context";
import type { EntryActions } from "./entry-store";
import type { EntryState } from "./entry-state";

/**
 * 读取条目 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 EntryStoreProvider 内时.
 */
export function useEntryStore<Selected>(
  selector: (state: EntryState & EntryActions) => Selected,
): Selected {
  const store = useContext(EntryStoreContext);
  if (store === undefined) {
    throw new Error("useEntryStore 必须在 EntryStoreProvider 内使用");
  }
  return useStore(store, selector);
}
