import type { RecoveryBridge } from "@shared/vault/recovery-bridge";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";

import type { VaultResultReflection } from "./vault-result-reflection";
import type { VaultActions } from "./vault-store-types";

/**
 * 凭恢复词恢复相关的动作.
 */
export type VaultRecoveryActions = Pick<
  VaultActions,
  | "verifyRecoveryWords"
  | "restoreWithMasterPassword"
  | "restoreWithoutMasterPassword"
  | "saveRecoveryTextFile"
>;

/**
 * 创建凭恢复词恢复相关的动作: 校验词不改变状态, 恢复成功后状态变为已解锁.
 * @param recoveryBridge 主进程提供的恢复接口.
 * @param reflection 让状态跟随操作结果的函数.
 * @returns 恢复相关的动作.
 */
export function createVaultRecoveryActions(
  recoveryBridge: RecoveryBridge,
  reflection: VaultResultReflection,
): VaultRecoveryActions {
  return {
    verifyRecoveryWords: async (
      words: readonly string[],
    ): Promise<VaultOperationResult> => {
      const result = await recoveryBridge.verifyWords(words);
      if (!result.ok) {
        await reflection.reflectFailure(result);
      }
      return result;
    },
    restoreWithMasterPassword: async (words, masterPassword) =>
      reflection.reflect(
        await recoveryBridge.restoreWithMasterPassword(words, masterPassword),
      ),
    restoreWithoutMasterPassword: async (words) =>
      reflection.reflect(
        await recoveryBridge.restoreWithoutMasterPassword(words),
      ),
    saveRecoveryTextFile: (words) => recoveryBridge.saveTextFile(words),
  };
}
