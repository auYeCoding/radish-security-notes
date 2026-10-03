import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRemoveTag } from "@renderer/stores/use-remove-tag";

/**
 * 删除标签的状态与方法.
 */
export interface DeleteTag {
  /**
   * 删除是否正在执行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 确认删除: 删除标签, 条目上的它被摘掉, 成功时调用成功回调, 失败时记下失败文案.
   * @returns 删除完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 跟踪删除标签的执行状态与结果.
 * @param tagId 要删除的标签编号.
 * @param onDeleted 删除成功后的回调.
 * @returns 执行状态, 失败文案与确认方法.
 */
export function useDeleteTag(tagId: string, onDeleted: () => void): DeleteTag {
  const { t } = useTranslation();
  const remove = useRemoveTag();
  const [isDeleting, setIsDeleting] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const confirm = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setFailureMessage(undefined);
    const result = await remove(tagId);
    if (result.ok) {
      onDeleted();
      return;
    }
    setIsDeleting(false);
    setFailureMessage(
      result.reason === "not-found"
        ? t("tagDelete.error.notFound")
        : t("tagDelete.error.unexpected"),
    );
  }, [remove, tagId, onDeleted, t]);
  return { isDeleting, failureMessage, confirm };
}
