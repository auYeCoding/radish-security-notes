import { useContext } from "react";
import { useStore } from "zustand";

import { VaultStoreContext } from "./vault-store-context";
import type { VaultActions, VaultState } from "./vault-store";

/**
 * 读取保险库 store 中的一部分状态或动作, 只在选中的部分变化时重新渲染.
 * @param selector 从完整状态里选出需要的部分.
 * @returns 选出的部分.
 * @throws Error 组件不在 VaultStoreProvider 内时.
 */
export function useVaultStore<Selected>(
  selector: (state: VaultState & VaultActions) => Selected,
): Selected {
  const store = useContext(VaultStoreContext);
  if (store === undefined) {
    throw new Error("useVaultStore 必须在 VaultStoreProvider 内使用");
  }
  return useStore(store, selector);
}
