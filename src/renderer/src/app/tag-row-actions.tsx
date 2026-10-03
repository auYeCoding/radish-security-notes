import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TagSummary } from "@shared/tags/tag-types";

import { RowActionsMenu } from "@renderer/components/row-actions-menu";
import { DropdownMenuItem } from "@renderer/components/ui/dropdown-menu";
import { DeleteTagDialog } from "@renderer/features/tag-delete/delete-tag-dialog";
import { EditTagDialog } from "@renderer/features/tag-edit/edit-tag-dialog";

/**
 * 标签行尾操作的属性.
 */
interface TagRowActionsProps {
  /**
   * 这一行的标签.
   */
  readonly tag: TagSummary;
}

/**
 * 当前打开的对话框: 编辑, 删除, 或都没有打开.
 */
type OpenDialog = "edit" | "delete" | undefined;

/**
 * 标签行尾的 "更多" 菜单, 里面是编辑与删除; 选中菜单项后打开对应的对话框. 对话框由本组件
 * 持有而不放进菜单里, 菜单关闭时对话框不会随之卸载.
 * @param props 组件属性.
 * @returns 菜单与对话框元素.
 */
export function TagRowActions(props: TagRowActionsProps): React.JSX.Element {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(undefined);
  const close = (): void => setOpenDialog(undefined);
  return (
    <>
      <RowActionsMenu label={t("folderPane.actions", { name: props.tag.name })}>
        <DropdownMenuItem onClick={() => setOpenDialog("edit")}>
          <PencilIcon aria-hidden="true" />
          {t("tagEdit.open")}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => setOpenDialog("delete")}
        >
          <Trash2Icon aria-hidden="true" />
          {t("tagDelete.open")}
        </DropdownMenuItem>
      </RowActionsMenu>
      {openDialog === "edit" && (
        <EditTagDialog tag={props.tag} onClose={close} />
      )}
      {openDialog === "delete" && (
        <DeleteTagDialog tag={props.tag} onClose={close} />
      )}
    </>
  );
}
