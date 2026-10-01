import type { VaultBridge } from "@shared/vault/vault-bridge";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import { createStore, type StoreApi } from "zustand/vanilla";

/**
 * 保险库状态: 决定显示引导页, 解锁页, 失败页还是三栏主界面.
 */
export interface VaultState {
  /**
   * 保险库当前的状态.
   */
  readonly status: VaultStatus;
}

/**
 * 保险库动作: 经主进程设置主密码, 跳过或解锁, 并让状态跟随结果.
 */
export interface VaultActions {
  /**
   * 首次设置主密码.
   * @param masterPassword 用户设置的主密码.
   * @returns 设置结果, 成功时状态变为已解锁.
   */
  setupWithMasterPassword: (
    masterPassword: string,
  ) => Promise<VaultOperationResult>;
  /**
   * 首次启动时跳过主密码.
   * @returns 设置结果, 成功时状态变为已解锁.
   */
  setupWithoutMasterPassword: () => Promise<VaultOperationResult>;
  /**
   * 用主密码解锁.
   * @param masterPassword 用户输入的主密码.
   * @returns 解锁结果, 成功时状态变为已解锁.
   */
  unlock: (masterPassword: string) => Promise<VaultOperationResult>;
}

/**
 * 保险库 store 的完整形状.
 */
export type VaultStore = StoreApi<VaultState & VaultActions>;

/**
 * 创建保险库 store 的依赖.
 */
export interface VaultStoreDependencies {
  /**
   * 主进程提供的保险库接口.
   */
  readonly bridge: VaultBridge;
  /**
   * 启动时从主进程取得的保险库状态.
   */
  readonly initialStatus: VaultStatus;
}

/**
 * 创建保险库 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * 操作成功时状态变为已解锁; 主进程报告意外错误时变为失败; 主进程报告状态与渲染端
 * 预期不符时重新向主进程取状态.
 * @param dependencies store 的依赖.
 * @returns 保险库 store.
 */
export function createVaultStore(
  dependencies: VaultStoreDependencies,
): VaultStore {
  const { bridge, initialStatus } = dependencies;
  return createStore<VaultState & VaultActions>()((set) => {
    const reflect = async (
      result: VaultOperationResult,
    ): Promise<VaultOperationResult> => {
      if (result.ok) {
        set({ status: "unlocked" });
      } else if (result.reason === "unexpected-error") {
        set({ status: "failed" });
      } else if (result.reason === "unexpected-state") {
        set({ status: await bridge.getStatus() });
      }
      return result;
    };
    return {
      status: initialStatus,
      setupWithMasterPassword: async (masterPassword) =>
        reflect(await bridge.setupWithMasterPassword(masterPassword)),
      setupWithoutMasterPassword: async () =>
        reflect(await bridge.setupWithoutMasterPassword()),
      unlock: async (masterPassword) =>
        reflect(await bridge.unlock(masterPassword)),
    };
  });
}
