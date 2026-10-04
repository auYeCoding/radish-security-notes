import { TicketMinusIcon, TicketPlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TagColorDot } from "@renderer/components/tag-color-dot";
import { DropdownMenuItem } from "@renderer/components/ui/dropdown-menu";
import { useSortedTags } from "@renderer/stores/use-sorted-tags";

import { BatchMenuButton } from "./batch-menu-button";

/**
 * 批量标签操作的方式.
 */
export type BatchTagMode = "add" | "remove";

/**
 * 批量标签菜单的属性.
 */
interface BatchTagMenuProps {
  /**
   * 菜单是给选中的条目加标签还是摘标签.
   */
  readonly mode: BatchTagMode;
  /**
   * 是否禁用.
   */
  readonly isDisabled: boolean;
  /**
   * 选了标签时的回调, 参数是标签编号.
   */
  readonly onChoose: (tagId: string) => void;
}

/**
 * 批量加标签与摘标签共用的下拉菜单: 每个标签一行并带颜色点 (按名称排序规则), 点一个就对选中的
 * 条目执行, 一次一个标签. 还没有任何标签时菜单里只有一行不可选的提示.
 * @param props 组件属性.
 * @returns 菜单按钮元素.
 */
export function BatchTagMenu(props: BatchTagMenuProps): React.JSX.Element {
  const { t } = useTranslation();
  const tags = useSortedTags();
  const isAdding = props.mode === "add";
  return (
    <BatchMenuButton
      label={t(isAdding ? "batch.addTag" : "batch.removeTag")}
      icon={
        isAdding ? (
          <TicketPlusIcon aria-hidden="true" />
        ) : (
          <TicketMinusIcon aria-hidden="true" />
        )
      }
      isDisabled={props.isDisabled}
    >
      {tags.length === 0 && (
        <DropdownMenuItem disabled>
          {t("folderPane.emptyTags")}
        </DropdownMenuItem>
      )}
      {tags.map((tag) => (
        <DropdownMenuItem key={tag.id} onClick={() => props.onChoose(tag.id)}>
          <TagColorDot color={tag.color} />
          <span className="truncate">{tag.name}</span>
        </DropdownMenuItem>
      ))}
    </BatchMenuButton>
  );
}
