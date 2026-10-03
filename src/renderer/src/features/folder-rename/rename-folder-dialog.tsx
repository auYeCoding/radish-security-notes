import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { FOLDER_NAME_MAX_LENGTH } from "@shared/folders/folder-name-schema";
import type { FolderSummary } from "@shared/folders/folder-types";

import { FolderNameDialog } from "@renderer/components/folder-name-dialog";
import { useFolderNameSubmit } from "@renderer/components/use-folder-name-submit";
import { useFolderStore } from "@renderer/stores/use-folder-store";

/**
 * 重命名文件夹对话框的属性.
 */
interface RenameFolderDialogProps {
  /**
   * 要重命名的文件夹, 输入框以它现在的名称为初始取值.
   */
  readonly folder: FolderSummary;
  /**
   * 对话框要关闭时的回调, 取消或重命名成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 重命名文件夹的对话框, 挂载即打开, 关闭即卸载: 输入框预填现在的名称, 保存后经文件夹 store 重命名,
 * 成功后关闭; 重名等失败原因显示在名称输入框下方.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function RenameFolderDialog(
  props: RenameFolderDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const rename = useFolderStore((state) => state.rename);
  const folderId = props.folder.id;
  const renameThisFolder = useCallback(
    (name: string) => rename(folderId, name),
    [rename, folderId],
  );
  const { failureMessage, submit } = useFolderNameSubmit(
    renameThisFolder,
    props.onClose,
  );
  return (
    <FolderNameDialog
      title={t("folderRename.title")}
      description={t("folderRename.description", {
        maxLength: FOLDER_NAME_MAX_LENGTH,
      })}
      submitLabel={t("folderRename.submit")}
      submittingLabel={t("folderRename.submitting")}
      initialName={props.folder.name}
      failureMessage={failureMessage}
      onSubmit={submit}
      onClose={props.onClose}
    />
  );
}
