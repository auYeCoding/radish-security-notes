import type { VaultEventsBridge } from "@shared/vault/vault-events-bridge";

import type { VaultStore } from "@renderer/stores/vault-store";

/**
 * 让保险库 store 跟上主进程的自动锁定: 订阅主进程推送的自动锁定原因, 收到后把状态置为已锁定并记下
 * 原因. 工作区 store 的重置不在这里做, 由 `resetWorkspaceOnLock` 订阅状态变化统一完成.
 * @param vaultStore 保险库 store.
 * @param events 主进程推送的保险库事件接口.
 * @returns 取消订阅的函数.
 */
export function watchAutoLock(
  vaultStore: VaultStore,
  events: VaultEventsBridge,
): () => void {
  return events.onAutoLocked((reason) =>
    vaultStore.getState().applyAutoLock(reason),
  );
}
