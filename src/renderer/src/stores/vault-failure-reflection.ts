import type { VaultFailureInfo } from "@shared/vault/vault-failure";
import type { VaultOperationFailure } from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";

import type { VaultStateSetter } from "./vault-store-types";

/**
 * 创建让保险库状态跟随失败结果的函数: 意外错误立即变为失败并退出恢复流程, 状态不符时重新向主进程
 * 取状态. 状态是失败时再向主进程取失败信息, 取不到按没有处理, 页面仍显示通用说明.
 * @param set 写入状态的函数.
 * @param readStatus 向主进程读取当前状态的函数.
 * @param readFailure 向主进程读取失败信息的函数.
 * @returns 让状态跟随失败结果的函数.
 */
export function createFailureReflection(
  set: VaultStateSetter,
  readStatus: () => Promise<VaultStatus>,
  readFailure: () => Promise<VaultFailureInfo | undefined>,
): (failure: VaultOperationFailure) => Promise<void> {
  const loadFailure = async (): Promise<void> => {
    try {
      set({ failure: await readFailure() });
    } catch {
      set({ failure: undefined });
    }
  };
  return async (failure) => {
    if (failure.reason === "unexpected-error") {
      set({ status: "failed", isRestoreRequested: false, failure: undefined });
      await loadFailure();
    } else if (failure.reason === "unexpected-state") {
      const status = await readStatus();
      set({ status, isRestoreRequested: false, failure: undefined });
      if (status === "failed") {
        await loadFailure();
      }
    }
  };
}
