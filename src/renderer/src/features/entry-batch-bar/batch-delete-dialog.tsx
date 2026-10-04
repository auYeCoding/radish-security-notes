import { useTranslation } from "react-i18next";

import { DestructiveConfirmDialog } from "@renderer/components/destructive-confirm-dialog";
import { useBatchOperations } from "@renderer/stores/use-batch-operations";

import { useBatchRun } from "./use-batch-run";

/**
 * 批量删除确认框的属性.
 */
interface BatchDeleteDialogProps {
  /**
   * 要删除的条目编号.
   */
  readonly entryIds: readonly string[];
  /**
   * 确认框要关闭时的回调, 取消或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 批量删除的确认框, 挂载即打开, 关闭即卸载: 写明要删除的条目数和删除后无法恢复, 用户点 "删除" 才
 * 执行, 点 "取消" 或按 Esc 则保留条目. 删除进行中按钮禁用并显示处理中的文案, 失败的原因显示在说明
 * 下方, 失败时整批条目都没有删除. 取消, 确认与处理中的文案沿用单个删除.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function BatchDeleteDialog(
  props: BatchDeleteDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { entryIds, onClose } = props;
  const operations = useBatchOperations();
  const { isRunning, failureMessage, run } = useBatchRun();
  const confirm = async (): Promise<void> => {
    const result = await run(() => operations.removeEntries(entryIds));
    if (result.ok) {
      onClose();
    }
  };
  return (
    <DestructiveConfirmDialog
      title={t("batch.deleteTitle")}
      description={t("batch.deleteDescription", { count: entryIds.length })}
      cancelLabel={t("entryDelete.cancel")}
      confirmLabel={t("entryDelete.confirm")}
      pendingLabel={t("entryDelete.deleting")}
      isPending={isRunning}
      failureMessage={failureMessage}
      onConfirm={() => void confirm()}
      onClose={onClose}
    />
  );
}
