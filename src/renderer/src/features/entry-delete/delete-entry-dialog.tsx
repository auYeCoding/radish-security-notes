import { useTranslation } from "react-i18next";

import type { EntryDetail } from "@shared/entries/entry-types";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";

import { useDeleteEntry } from "./use-delete-entry";

/**
 * 删除确认框的属性.
 */
interface DeleteEntryDialogProps {
  /**
   * 要删除的条目详情.
   */
  readonly detail: EntryDetail;
  /**
   * 确认框要关闭时的回调, 取消或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 删除条目的确认框, 挂载即打开, 关闭即卸载: 写明条目名称和删除后无法恢复, 用户点 "删除" 才执行,
 * 点 "取消" 或按 Esc 则保留条目. 删除进行中按钮禁用并显示处理中的文案, 失败的原因显示在说明
 * 下方.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DeleteEntryDialog(
  props: DeleteEntryDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { detail, onClose } = props;
  const { isDeleting, failureMessage, confirm } = useDeleteEntry(
    detail.id,
    onClose,
  );
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isDeleting) {
      onClose();
    }
  };
  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("entryDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {t("entryDelete.description", { name: detail.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t("entryDelete.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={() => void confirm()}
          >
            {isDeleting ? t("entryDelete.deleting") : t("entryDelete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
