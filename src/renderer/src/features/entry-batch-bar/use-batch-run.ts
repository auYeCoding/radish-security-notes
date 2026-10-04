import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BatchResult } from "@shared/batch/batch-result";

import { describeBatchFailure } from "./describe-batch-failure";

/**
 * 执行批量操作的状态与方法.
 */
export interface BatchRun {
  /**
   * 批量操作是否正在执行.
   */
  readonly isRunning: boolean;
  /**
   * 最近一次批量操作失败的文案, 没有失败, 重新执行或关闭提示后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 执行一次批量操作, 跟踪执行状态, 失败时记下失败文案.
   * @param call 发起批量操作的方法.
   * @returns 操作的结果.
   */
  readonly run: <Value>(
    call: () => Promise<BatchResult<Value>>,
  ) => Promise<BatchResult<Value>>;
  /**
   * 忽略最近一次失败的文案.
   */
  readonly dismiss: () => void;
}

/**
 * 跟踪批量操作的执行状态与结果: 操作栏的菜单操作与批量删除确认框各用一份.
 * @returns 执行状态, 失败文案与执行, 忽略方法.
 */
export function useBatchRun(): BatchRun {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const run = useCallback(
    async <Value>(
      call: () => Promise<BatchResult<Value>>,
    ): Promise<BatchResult<Value>> => {
      setIsRunning(true);
      setFailureMessage(undefined);
      const result = await call();
      setIsRunning(false);
      if (!result.ok) {
        setFailureMessage(describeBatchFailure(result.reason, t));
      }
      return result;
    },
    [t],
  );
  const dismiss = useCallback(() => setFailureMessage(undefined), []);
  return { isRunning, failureMessage, run, dismiss };
}
