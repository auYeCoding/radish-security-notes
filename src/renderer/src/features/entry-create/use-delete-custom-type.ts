import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useEntryTypeStore } from "@renderer/stores/use-entry-type-store";

import { describeCustomTypeFailure } from "./custom-type-errors";

/**
 * 删除自定义类型的进行状态与方法.
 */
export interface DeleteCustomType {
  /**
   * 删除是否正在进行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败或重新开始后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 带确认标记删除类型, 成功后让条目一侧跟上 (重读列表, 详情与搜索) 并调用关闭回调, 失败时记下
   * 失败文案. 确认框本身就是用户的确认, 所以总是带确认标记.
   * @returns 删除完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 跟踪删除一个自定义类型的进行状态与结果.
 * @param typeId 要删除的类型的唯一编号.
 * @param onClose 删除成功后的回调, 例如关闭确认框.
 * @returns 进行状态, 失败文案与确认删除的方法.
 */
export function useDeleteCustomType(
  typeId: string,
  onClose: () => void,
): DeleteCustomType {
  const { t } = useTranslation();
  const remove = useEntryTypeStore((state) => state.remove);
  const reloadEntries = useEntryStore((state) => state.reloadAfterTypeChange);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const confirm = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setFailureMessage(undefined);
    const result = await remove({ id: typeId, isImpactConfirmed: true });
    if (result.ok) {
      await reloadEntries();
      onClose();
      return;
    }
    setFailureMessage(describeCustomTypeFailure(result.reason, t));
    setIsDeleting(false);
  }, [remove, reloadEntries, typeId, onClose, t]);
  return { isDeleting, failureMessage, confirm };
}
