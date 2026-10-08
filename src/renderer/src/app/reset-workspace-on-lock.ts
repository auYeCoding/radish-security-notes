import type { VaultStore } from "@renderer/stores/vault-store";

import type { WorkspaceStores } from "./create-workspace-stores";
import { resetWorkspaceStores } from "./reset-workspace-stores";

/**
 * 让工作区的 store 跟随保险库锁定: 保险库状态从 unlocked 变为其它状态 (锁定, 失败) 的那一刻就同步
 * 重置全部工作区 store, 早于界面切到解锁页, 内存里的条目与明文不会在界面切换期间残留.
 * @param vaultStore 保险库 store.
 * @param stores 工作区的全部 store.
 * @returns 取消订阅的函数.
 */
export function resetWorkspaceOnLock(
  vaultStore: VaultStore,
  stores: WorkspaceStores,
): () => void {
  return vaultStore.subscribe((state, previous) => {
    if (previous.status === "unlocked" && state.status !== "unlocked") {
      resetWorkspaceStores(stores);
    }
  });
}
