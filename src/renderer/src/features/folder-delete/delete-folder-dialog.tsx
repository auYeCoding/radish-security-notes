import { useTranslation } from "react-i18next";

import type { FolderSummary } from "@shared/folders/folder-types";
import { countEntriesInView, folderViewOf } from "@shared/folders/folder-view";

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
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { useDeleteFolder } from "./use-delete-folder";

/**
 * 删除确认框的属性.
 */
interface DeleteFolderDialogProps {
  /**
   * 要删除的文件夹.
   */
  readonly folder: FolderSummary;
  /**
   * 确认框要关闭时的回调, 取消或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 删除确认框的内容的属性.
 */
interface DeleteFolderBodyProps extends Omit<
  DeleteFolderDialogProps,
  "onClose"
> {
  /**
   * 删除是否正在执行.
   */
  readonly isDeleting: boolean;
  /**
   * 最近一次删除失败的文案, 没有失败时为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 点 "删除" 时的回调.
   */
  readonly onConfirm: () => void;
}

/**
 * 确认框的内容: 标题, 说明 (其中有条目时写明条目数量与 "变为无文件夹, 条目本身不删除"), 失败原因,
 * 取消与删除按钮.
 * @param props 组件属性.
 * @returns 确认框内容元素.
 */
function DeleteFolderBody(props: DeleteFolderBodyProps): React.JSX.Element {
  const { t } = useTranslation();
  const { folder } = props;
  const entryCount = useEntryStore((state) =>
    countEntriesInView(state.entries, folderViewOf(folder.id)),
  );
  const description =
    entryCount === 0
      ? t("folderDelete.descriptionEmpty", { name: folder.name })
      : t("folderDelete.descriptionWithEntries", {
          name: folder.name,
          count: entryCount,
        });
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("folderDelete.title")}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {props.failureMessage !== undefined && (
        <Alert variant="destructive">
          <AlertDescription>{props.failureMessage}</AlertDescription>
        </Alert>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={props.isDeleting}>
          {t("folderDelete.cancel")}
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={props.isDeleting}
          onClick={props.onConfirm}
        >
          {props.isDeleting
            ? t("folderDelete.deleting")
            : t("folderDelete.confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * 删除文件夹的确认框, 挂载即打开, 关闭即卸载: 用户点 "删除" 才执行, 点 "取消" 或按 Esc 则保留.
 * 删除进行中不响应关闭.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DeleteFolderDialog(
  props: DeleteFolderDialogProps,
): React.JSX.Element {
  const { folder, onClose } = props;
  const { isDeleting, failureMessage, confirm } = useDeleteFolder(
    folder.id,
    onClose,
  );
  return (
    <AlertDialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isDeleting) {
          onClose();
        }
      }}
    >
      <DeleteFolderBody
        folder={folder}
        isDeleting={isDeleting}
        failureMessage={failureMessage}
        onConfirm={() => void confirm()}
      />
    </AlertDialog>
  );
}
