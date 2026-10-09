import { FolderInputIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DropdownMenuItem } from "@renderer/components/ui/dropdown-menu";
import { useSortedFolders } from "@renderer/stores/use-sorted-folders";

import { BatchMenuButton } from "./batch-menu-button";

/**
 * 移入文件夹菜单的属性.
 */
interface BatchMoveMenuProps {
  /**
   * 是否禁用.
   */
  readonly isDisabled: boolean;
  /**
   * 选了目标时的回调, 移出文件夹时参数为 undefined.
   */
  readonly onMove: (folderId: string | undefined) => void;
}

/**
 * 批量移入文件夹的下拉菜单: 列出 "无文件夹" 与全部文件夹 (按名称排序规则), 点一项就把选中的条目
 * 移进去或移出文件夹, 没有二次确认.
 * @param props 组件属性.
 * @returns 菜单按钮元素.
 */
export function BatchMoveMenu(props: BatchMoveMenuProps): React.JSX.Element {
  const { t } = useTranslation();
  const folders = useSortedFolders();
  return (
    <BatchMenuButton
      label={t("batch.move")}
      icon={<FolderInputIcon aria-hidden="true" />}
      isDisabled={props.isDisabled}
    >
      <DropdownMenuItem onClick={() => props.onMove(undefined)}>
        {t("batch.moveToNoFolder")}
      </DropdownMenuItem>
      {folders.map((folder) => (
        <DropdownMenuItem
          key={folder.id}
          onClick={() => props.onMove(folder.id)}
        >
          <span className="truncate">{folder.name}</span>
        </DropdownMenuItem>
      ))}
    </BatchMenuButton>
  );
}
