import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useRemoveFolder } from "@renderer/stores/use-remove-folder";

/**
 * 删除文件夹的状态与方法.
 */
export interface DeleteFolder {
  /**
   * 删除是否正在执行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败或重新提交后为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 确认删除: 删除文件夹, 其中条目移到未分类, 成功时调用成功回调, 失败时记下失败文案.
   * @returns 删除完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 跟踪删除文件夹的执行状态与结果.
 * @param folderId 要删除的文件夹编号.
 * @param onDeleted 删除成功后的回调.
 * @returns 执行状态, 失败文案与确认方法.
 */
export function useDeleteFolder(
  folderId: string,
  onDeleted: () => void,
): DeleteFolder {
  const { t } = useTranslation();
  const remove = useRemoveFolder();
  const [isDeleting, setIsDeleting] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const confirm = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    setFailureMessage(undefined);
    const result = await remove(folderId);
    if (result.ok) {
      onDeleted();
      return;
    }
    setIsDeleting(false);
    setFailureMessage(
      result.reason === "not-found"
        ? t("folderDelete.error.notFound")
        : t("folderDelete.error.unexpected"),
    );
  }, [remove, folderId, onDeleted, t]);
  return { isDeleting, failureMessage, confirm };
}
