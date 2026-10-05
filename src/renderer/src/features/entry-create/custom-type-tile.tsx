import { PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { entryTypeName } from "@renderer/components/entry-type-naming";
import { RowActionsMenu } from "@renderer/components/row-actions-menu";
import { DropdownMenuItem } from "@renderer/components/ui/dropdown-menu";

import { EntryTypeTile } from "./entry-type-tile";

/**
 * 自定义类型格的属性.
 */
interface CustomTypeTileProps {
  /**
   * 这个格子代表的自定义类型.
   */
  readonly type: EntryTypeDefinition;
  /**
   * 点击格子时的回调, 参数是被选中的类型.
   */
  readonly onSelect: (type: EntryTypeDefinition) => void;
  /**
   * 选中菜单里 "编辑类型" 时的回调.
   */
  readonly onEdit: (type: EntryTypeDefinition) => void;
  /**
   * 选中菜单里 "删除类型" 时的回调.
   */
  readonly onDelete: (type: EntryTypeDefinition) => void;
}

/**
 * 类型选择网格里一个自定义类型的格子: 点击格子即选中这个类型, 右上角的 "更多" 菜单里是编辑类型与
 * 删除类型. 预设类型不可改不可删, 所以预设类型格没有菜单.
 * @param props 组件属性.
 * @returns 带菜单的类型格元素.
 */
export function CustomTypeTile(props: CustomTypeTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const { type } = props;
  return (
    <div className="relative flex">
      <EntryTypeTile type={type} onSelect={props.onSelect} className="flex-1" />
      <div className="absolute end-1 top-1">
        <RowActionsMenu
          label={t("entryCreate.customType.menu.label", {
            name: entryTypeName(type, t),
          })}
        >
          <DropdownMenuItem onClick={() => props.onEdit(type)}>
            <PencilIcon aria-hidden="true" />
            {t("entryCreate.customType.menu.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => props.onDelete(type)}
          >
            <Trash2Icon aria-hidden="true" />
            {t("entryCreate.customType.menu.delete")}
          </DropdownMenuItem>
        </RowActionsMenu>
      </div>
    </div>
  );
}
