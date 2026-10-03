import { useContext } from "react";
import { useStore } from "zustand";

import { TagStoreContext } from "./tag-store-context";
import type { TagActions } from "./tag-store";
import type { TagState } from "./tag-state";

/**
 * 读取标签 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 TagStoreProvider 内时.
 */
export function useTagStore<Selected>(
  selector: (state: TagState & TagActions) => Selected,
): Selected {
  const store = useContext(TagStoreContext);
  if (store === undefined) {
    throw new Error("useTagStore 必须在 TagStoreProvider 内使用");
  }
  return useStore(store, selector);
}
