import { useCallback, useState } from "react";

import {
  vaultOperationFailed,
  type VaultFailureReason,
  type VaultOperationFailure,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

/**
 * 一个保险库操作的执行状态与触发方法.
 */
export interface VaultOperation {
  /**
   * 操作是否正在执行, 用来禁用按钮并显示处理中的文案.
   */
  readonly isPending: boolean;
  /**
   * 最近一次操作失败的原因, 没有失败或重新执行后为 undefined.
   */
  readonly failureReason: VaultFailureReason | undefined;
  /**
   * 最近一次操作因恢复词不在词表而失败时, 那个词的序号 (从 1 起), 其它情形为 undefined.
   */
  readonly failureWordPosition: number | undefined;
  /**
   * 执行一个保险库操作, 记录执行状态与失败原因. 操作抛出错误时按意外错误处理.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  readonly run: (
    operation: () => Promise<VaultOperationResult>,
  ) => Promise<VaultOperationResult>;
}

/**
 * 跟踪一个保险库操作的执行状态与失败原因, 引导页, 解锁页与恢复页共用.
 * @returns 执行状态与触发方法.
 */
export function useVaultOperation(): VaultOperation {
  const [isPending, setIsPending] = useState(false);
  const [failure, setFailure] = useState<VaultOperationFailure | undefined>(
    undefined,
  );
  const run = useCallback(
    async (
      operation: () => Promise<VaultOperationResult>,
    ): Promise<VaultOperationResult> => {
      setIsPending(true);
      setFailure(undefined);
      try {
        const result = await operation();
        if (!result.ok) {
          setFailure(result);
        }
        return result;
      } catch {
        const unexpected = vaultOperationFailed("unexpected-error");
        setFailure(unexpected);
        return unexpected;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );
  return {
    isPending,
    failureReason: failure?.reason,
    failureWordPosition: failure?.wordPosition,
    run,
  };
}
