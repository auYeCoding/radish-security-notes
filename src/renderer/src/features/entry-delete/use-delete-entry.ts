import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEntryStore } from "@renderer/stores/use-entry-store";

import { describeDeleteFailure } from "./describe-delete-failure";

/**
 * 删除条目的状态与方法.
 */
export interface DeleteEntry {
  /**
   * 删除是否正在执行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 确认删除: 经条目 store 删除条目, 成功时调用成功回调, 失败时记下失败文案.
   * @returns 删除完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 跟踪删除条目的执行状态与结果.
 * @param entryId 要删除的条目编号.
 * @param onDeleted 删除成功后的回调.
 * @returns 执行状态, 失败文案与确认方法.
 */
export function useDeleteEntry(
  entryId: string,
  onDeleted: () => void,
): DeleteEntry {
  const { t } = useTranslation();
  const remove = useEntryStore((state) => state.remove);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const confirm = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setFailureMessage(undefined);
    const result = await remove(entryId);
    if (result.ok) {
      onDeleted();
      return;
    }
    setIsDeleting(false);
    setFailureMessage(describeDeleteFailure(result.reason, t));
  }, [remove, entryId, onDeleted, t]);
  return { isDeleting, failureMessage, confirm };
}
