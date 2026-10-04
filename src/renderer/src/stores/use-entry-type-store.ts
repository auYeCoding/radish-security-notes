import { useContext } from "react";
import { useStore } from "zustand";

import { EntryTypeStoreContext } from "./entry-type-store-context";
import type { EntryTypeActions } from "./entry-type-store";
import type { EntryTypeState } from "./entry-type-state";

/**
 * 读取自定义条目类型 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 EntryTypeStoreProvider 内时.
 */
export function useEntryTypeStore<Selected>(
  selector: (state: EntryTypeState & EntryTypeActions) => Selected,
): Selected {
  const store = useContext(EntryTypeStoreContext);
  if (store === undefined) {
    throw new Error("useEntryTypeStore 必须在 EntryTypeStoreProvider 内使用");
  }
  return useStore(store, selector);
}
