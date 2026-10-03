import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FolderResult } from "@shared/folders/folder-result";

import { describeFolderNameFailure } from "@renderer/components/folder-name-errors";

/**
 * 文件夹名称提交的状态与方法.
 */
export interface FolderNameSubmit {
  /**
   * 最近一次提交失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 提交校验后的名称: 执行调用方给出的动作, 成功时调用成功回调, 失败时记下失败文案.
   * @param name 校验后的名称.
   * @returns 提交完成后兑现.
   */
  readonly submit: (name: string) => Promise<void>;
}

/**
 * 跟踪新建与重命名文件夹的提交结果.
 * @param action 用名称执行的动作, 例如经文件夹 store 新建或重命名.
 * @param onSucceeded 动作成功后的回调, 例如关闭对话框.
 * @returns 失败文案与提交方法.
 */
export function useFolderNameSubmit(
  action: (name: string) => Promise<FolderResult<unknown>>,
  onSucceeded: () => void,
): FolderNameSubmit {
  const { t } = useTranslation();
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const submit = useCallback(
    async (name: string): Promise<void> => {
      setFailureMessage(undefined);
      const result = await action(name);
      if (result.ok) {
        onSucceeded();
        return;
      }
      setFailureMessage(describeFolderNameFailure(result.reason, t));
    },
    [action, onSucceeded, t],
  );
  return { failureMessage, submit };
}
