import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { FolderSummary } from "@shared/folders/folder-types";

import { RowActionsMenu } from "@renderer/components/row-actions-menu";
import { DropdownMenuItem } from "@renderer/components/ui/dropdown-menu";
import { DeleteFolderDialog } from "@renderer/features/folder-delete/delete-folder-dialog";
import { RenameFolderDialog } from "@renderer/features/folder-rename/rename-folder-dialog";

/**
 * 文件夹行尾操作的属性.
 */
interface FolderRowActionsProps {
  /**
   * 这一行的文件夹.
   */
  readonly folder: FolderSummary;
}

/**
 * 当前打开的对话框: 重命名, 删除, 或都没有打开.
 */
type OpenDialog = "rename" | "delete" | undefined;

/**
 * 文件夹行尾的 "更多" 菜单, 里面是重命名与删除; 选中菜单项后打开对应的对话框. 对话框由本组件
 * 持有而不放进菜单里, 菜单关闭时对话框不会随之卸载.
 * @param props 组件属性.
 * @returns 菜单与对话框元素.
 */
export function FolderRowActions(
  props: FolderRowActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(undefined);
  const close = (): void => setOpenDialog(undefined);
  return (
    <>
      <RowActionsMenu
        label={t("folderPane.actions", { name: props.folder.name })}
      >
        <DropdownMenuItem onClick={() => setOpenDialog("rename")}>
          <PencilIcon aria-hidden="true" />
          {t("folderRename.open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setOpenDialog("delete")}
        >
          <Trash2Icon aria-hidden="true" />
          {t("folderDelete.open")}
        </DropdownMenuItem>
      </RowActionsMenu>
      {openDialog === "rename" && (
        <RenameFolderDialog folder={props.folder} onClose={close} />
      )}
      {openDialog === "delete" && (
        <DeleteFolderDialog folder={props.folder} onClose={close} />
      )}
    </>
  );
}
