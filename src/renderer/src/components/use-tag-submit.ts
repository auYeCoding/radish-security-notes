import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import type { TagFormValues } from "@shared/tags/tag-name-schema";
import type { TagResult } from "@shared/tags/tag-result";

import { describeTagFailure } from "@renderer/components/tag-name-errors";

/**
 * 标签表单提交的状态与方法.
 */
export interface TagSubmit {
  /**
   * 最近一次提交失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 提交校验后的取值: 执行调用方给出的动作, 成功时调用成功回调, 失败时记下失败文案.
   * @param values 校验后的名称与颜色.
   * @returns 提交完成后兑现.
   */
  readonly submit: (values: TagFormValues) => Promise<void>;
}

/**
 * 跟踪新建与编辑标签的提交结果.
 * @param action 用名称与颜色执行的动作, 例如经标签 store 新建或编辑.
 * @param onSucceeded 动作成功后的回调, 例如关闭对话框.
 * @returns 失败文案与提交方法.
 */
export function useTagSubmit(
  action: (values: TagFormValues) => Promise<TagResult<unknown>>,
  onSucceeded: () => void,
): TagSubmit {
  const { t } = useTranslation();
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const submit = useCallback(
    async (values: TagFormValues): Promise<void> => {
      setFailureMessage(undefined);
      const result = await action(values);
      if (result.ok) {
        onSucceeded();
        return;
      }
      setFailureMessage(describeTagFailure(result.reason, t));
    },
    [action, onSucceeded, t],
  );
  return { failureMessage, submit };
}
