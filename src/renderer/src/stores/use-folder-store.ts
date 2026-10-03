import { useContext } from "react";
import { useStore } from "zustand";

import { FolderStoreContext } from "./folder-store-context";
import type { FolderActions } from "./folder-store";
import type { FolderState } from "./folder-state";

/**
 * 读取文件夹 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 FolderStoreProvider 内时.
 */
export function useFolderStore<Selected>(
  selector: (state: FolderState & FolderActions) => Selected,
): Selected {
  const store = useContext(FolderStoreContext);
  if (store === undefined) {
    throw new Error("useFolderStore 必须在 FolderStoreProvider 内使用");
  }
  return useStore(store, selector);
}
