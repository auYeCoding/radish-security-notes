import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  customTypeIdOf,
  isCustomTypeKey,
} from "@shared/entries/custom-types/custom-entry-type-key";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { useEntryTypeCatalog } from "@renderer/stores/use-entry-type-catalog";

import { CustomTypeTile } from "./custom-type-tile";
import { DeleteCustomTypeDialog } from "./delete-custom-type-dialog";
import { EntryTypeTile } from "./entry-type-tile";
import { NewTypeTile } from "./new-type-tile";

/**
 * 类型网格的属性.
 */
interface EntryTypeGridProps {
  /**
   * 选中一个类型时的回调, 参数是被选中的类型.
   */
  readonly onSelect: (type: EntryTypeDefinition) => void;
  /**
   * 选中末尾的 "新建类型" 格时的回调.
   */
  readonly onCreateType: () => void;
  /**
   * 选中自定义类型格菜单里 "编辑类型" 时的回调, 参数是自定义类型的唯一编号.
   */
  readonly onEditType: (typeId: string) => void;
}

/**
 * 新建条目第一步的类型选择网格: 全部预设类型按预设顺序排在前面, 用户的自定义类型按创建先后接在
 * 后面, 最后是 "新建类型" 格; 窄时两列, 宽时三列. 自定义类型格带 "更多" 菜单, 里面是编辑类型与
 * 删除类型, 删除前先弹出确认框; 预设类型格没有菜单.
 * @param props 组件属性.
 * @returns 类型网格元素.
 */
export function EntryTypeGrid(props: EntryTypeGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const catalog = useEntryTypeCatalog();
  const [deletingType, setDeletingType] = useState<
    EntryTypeDefinition | undefined
  >(undefined);
  return (
    <>
      <div
        role="group"
        aria-label={t("entryCreate.typeStep.title")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {catalog.types.map((type) =>
          isCustomTypeKey(type.key) ? (
            <CustomTypeTile
              key={type.key}
              type={type}
              onSelect={props.onSelect}
              onEdit={(selected) =>
                props.onEditType(customTypeIdOf(selected.key) ?? selected.key)
              }
              onDelete={setDeletingType}
            />
          ) : (
            <EntryTypeTile
              key={type.key}
              type={type}
              onSelect={props.onSelect}
            />
          ),
        )}
        <NewTypeTile onSelect={props.onCreateType} />
      </div>
      {deletingType !== undefined && (
        <DeleteCustomTypeDialog
          type={deletingType}
          onClose={() => setDeletingType(undefined)}
        />
      )}
    </>
  );
}
