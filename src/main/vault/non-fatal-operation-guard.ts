import {
  vaultOperationFailed,
  type VaultOperationFailure,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";
import type { VaultSetupResult } from "@shared/vault/vault-setup-result";

/**
 * 不改变保险库状态的操作守卫.
 */
export interface NonFatalOperationGuard {
  /**
   * 执行一个操作. 同一时间只允许一个操作, 已有操作在执行时直接按状态不符拒绝; 操作抛出意外
   * 错误时只通知回调并返回失败结果, 不改变保险库状态.
   * @param operation 要执行的操作, 结果可以是带恢复词的成功结果.
   * @returns 操作结果, 被拒绝或意外失败时是失败结果.
   */
  readonly run: <Result extends VaultOperationResult | VaultSetupResult>(
    operation: () => Promise<Result>,
  ) => Promise<Result | VaultOperationFailure>;
}

/**
 * 创建不改变保险库状态的操作守卫. 保险库服务自己的守卫遇到意外失败会把状态置为失败并让界面
 * 进失败页; 已解锁后的主密码切换失败时数据与密钥文件都没有变化, 不应该如此.
 * @param onFailure 操作意外失败时的回调, 参数是底层错误.
 * @returns 操作守卫.
 */
export function createNonFatalOperationGuard(
  onFailure: (error: unknown) => void,
): NonFatalOperationGuard {
  let isRunning = false;
  return {
    run: async (operation) => {
      if (isRunning) {
        return vaultOperationFailed("unexpected-state");
      }
      isRunning = true;
      try {
        return await operation();
      } catch (error) {
        onFailure(error);
        return vaultOperationFailed("unexpected-error");
      } finally {
        isRunning = false;
      }
    },
  };
}
