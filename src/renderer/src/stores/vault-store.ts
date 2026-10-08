import { createStore } from "zustand/vanilla";

import { createVaultRecoveryActions } from "./vault-recovery-actions";
import { createVaultResultReflection } from "./vault-result-reflection";
import type {
  VaultActions,
  VaultState,
  VaultStore,
  VaultStoreDependencies,
} from "./vault-store-types";

export type {
  VaultActions,
  VaultState,
  VaultStore,
  VaultStoreDependencies,
} from "./vault-store-types";

/**
 * 创建保险库 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * 解锁与恢复成功时状态变为已解锁; 设置成功时状态变为已解锁并记下待确认的恢复词, 状态与词
 * 一次写入, 三栏主界面不会在确认前闪现; 主进程报告意外错误时变为失败; 主进程报告状态与
 * 渲染端预期不符时重新向主进程取状态; 主进程自动锁定后推送原因, 状态跟着变为已锁定并记下原因.
 * @param dependencies store 的依赖.
 * @returns 保险库 store.
 */
export function createVaultStore(
  dependencies: VaultStoreDependencies,
): VaultStore {
  const { bridge, recoveryBridge, initialStatus } = dependencies;
  return createStore<VaultState & VaultActions>()((set, get) => {
    const reflection = createVaultResultReflection(set, bridge.getStatus);
    return {
      status: initialStatus,
      pendingRecoveryWords: undefined,
      isRestoreRequested: false,
      lockReason: undefined,
      setupWithMasterPassword: async (masterPassword) =>
        reflection.reflectSetup(
          await bridge.setupWithMasterPassword(masterPassword),
        ),
      setupWithoutMasterPassword: async () =>
        reflection.reflectSetup(await bridge.setupWithoutMasterPassword()),
      unlock: async (masterPassword) =>
        reflection.reflect(await bridge.unlock(masterPassword)),
      lock: async () => reflection.reflectLock(await bridge.lock()),
      applyAutoLock: (reason) => {
        if (get().status === "unlocked") {
          set({
            status: "locked",
            pendingRecoveryWords: undefined,
            isRestoreRequested: false,
            lockReason: reason,
          });
        }
      },
      confirmRecoveryWords: () => set({ pendingRecoveryWords: undefined }),
      requestRestore: () => set({ isRestoreRequested: true }),
      cancelRestore: () => set({ isRestoreRequested: false }),
      ...createVaultRecoveryActions(recoveryBridge, reflection),
    };
  });
}
