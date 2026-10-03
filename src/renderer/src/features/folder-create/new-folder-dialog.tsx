import { useTranslation } from "react-i18next";

import { FOLDER_NAME_MAX_LENGTH } from "@shared/folders/folder-name-schema";

import { FolderNameDialog } from "@renderer/components/folder-name-dialog";
import { useFolderNameSubmit } from "@renderer/components/use-folder-name-submit";
import { useFolderStore } from "@renderer/stores/use-folder-store";

/**
 * 新建文件夹对话框的属性.
 */
interface NewFolderDialogProps {
  /**
   * 对话框要关闭时的回调, 取消或新建成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 新建文件夹的对话框, 挂载即打开, 关闭即卸载: 填写名称后经文件夹 store 新建, 成功后关闭;
 * 重名等失败原因显示在名称输入框下方.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NewFolderDialog(
  props: NewFolderDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const create = useFolderStore((state) => state.create);
  const { failureMessage, submit } = useFolderNameSubmit(create, props.onClose);
  return (
    <FolderNameDialog
      title={t("folderCreate.title")}
      description={t("folderCreate.description", {
        maxLength: FOLDER_NAME_MAX_LENGTH,
      })}
      submitLabel={t("folderCreate.submit")}
      submittingLabel={t("folderCreate.submitting")}
      initialName=""
      failureMessage={failureMessage}
      onSubmit={submit}
      onClose={props.onClose}
    />
  );
}
