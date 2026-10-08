import type {
  VaultOperationFailure,
  VaultOperationResult,
} from "@shared/vault/vault-operation-result";
import type { VaultFailureInfo } from "@shared/vault/vault-failure";
import type { VaultSetupResult } from "@shared/vault/vault-setup-result";
import type { VaultStatus } from "@shared/vault/vault-status";

import { createFailureReflection } from "./vault-failure-reflection";
import type { VaultState, VaultStateSetter } from "./vault-store-types";

/**
 * 让保险库状态跟随主进程操作结果的一组函数.
 */
export interface VaultResultReflection {
  /**
   * 让状态跟随解锁或恢复的结果: 成功变为已解锁并清除自动锁定的原因, 失败按原因处理.
   * @param result 操作结果.
   * @returns 原样返回操作结果.
   */
  readonly reflect: (
    result: VaultOperationResult,
  ) => Promise<VaultOperationResult>;
  /**
   * 让状态跟随锁定的结果: 成功变为已锁定并清除待确认的恢复词与恢复请求, 失败按原因处理.
   * @param result 锁定结果.
   * @returns 原样返回锁定结果.
   */
  readonly reflectLock: (
    result: VaultOperationResult,
  ) => Promise<VaultOperationResult>;
  /**
   * 让状态跟随设置的结果: 成功变为已解锁并记下待确认的恢复词, 失败按原因处理.
   * @param result 设置结果.
   * @returns 原样返回设置结果.
   */
  readonly reflectSetup: (
    result: VaultSetupResult,
  ) => Promise<VaultSetupResult>;
  /**
   * 让状态跟随失败结果: 意外错误变为失败并退出恢复流程, 状态不符时重新向主进程取状态. 状态是失败
   * 时再向主进程取失败信息, 取不到按没有处理.
   * @param failure 失败结果.
   * @returns 处理完成后兑现.
   */
  readonly reflectFailure: (failure: VaultOperationFailure) => Promise<void>;
}

/**
 * 解锁或恢复成功后写入的状态: 已解锁, 不再处于恢复流程, 自动锁定的原因和失败信息作废.
 */
const UNLOCKED_STATE: Partial<VaultState> = {
  status: "unlocked",
  isRestoreRequested: false,
  lockReason: undefined,
  failure: undefined,
};

/**
 * 创建让保险库状态跟随操作结果的函数.
 * @param set 写入状态的函数.
 * @param readStatus 向主进程读取当前状态的函数.
 * @param readFailure 向主进程读取失败信息的函数.
 * @returns 一组反映结果的函数.
 */
export function createVaultResultReflection(
  set: VaultStateSetter,
  readStatus: () => Promise<VaultStatus>,
  readFailure: () => Promise<VaultFailureInfo | undefined>,
): VaultResultReflection {
  const reflectFailure = createFailureReflection(set, readStatus, readFailure);
  const reflect = async (
    result: VaultOperationResult,
  ): Promise<VaultOperationResult> => {
    if (result.ok) {
      set(UNLOCKED_STATE);
    } else {
      await reflectFailure(result);
    }
    return result;
  };
  const reflectLock = async (
    result: VaultOperationResult,
  ): Promise<VaultOperationResult> => {
    if (result.ok) {
      set({
        status: "locked",
        pendingRecoveryWords: undefined,
        isRestoreRequested: false,
      });
    } else {
      await reflectFailure(result);
    }
    return result;
  };
  const reflectSetup = async (
    result: VaultSetupResult,
  ): Promise<VaultSetupResult> => {
    if (result.ok) {
      set({ status: "unlocked", pendingRecoveryWords: result.recoveryWords });
    } else {
      await reflectFailure(result);
    }
    return result;
  };
  return { reflect, reflectLock, reflectSetup, reflectFailure };
}
