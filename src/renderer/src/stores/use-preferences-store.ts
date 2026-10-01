import { useContext } from "react";
import { useStore } from "zustand";

import { PreferencesStoreContext } from "./preferences-store-context";
import type { PreferencesActions, PreferencesState } from "./preferences-store";

/**
 * 读取偏好 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 PreferencesStoreProvider 内时.
 */
export function usePreferencesStore<Selected>(
  selector: (state: PreferencesState & PreferencesActions) => Selected,
): Selected {
  const store = useContext(PreferencesStoreContext);
  if (store === undefined) {
    throw new Error(
      "usePreferencesStore 必须在 PreferencesStoreProvider 内使用",
    );
  }
  return useStore(store, selector);
}
