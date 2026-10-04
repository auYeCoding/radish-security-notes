import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { useEntryTypeCatalog } from "@renderer/stores/use-entry-type-catalog";

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
}

/**
 * 新建条目第一步的类型选择网格: 全部预设类型按预设顺序排在前面, 用户的自定义类型按创建先后接在
 * 后面, 最后是 "新建类型" 格; 窄时两列, 宽时三列.
 * @param props 组件属性.
 * @returns 类型网格元素.
 */
export function EntryTypeGrid(props: EntryTypeGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const catalog = useEntryTypeCatalog();
  return (
    <div
      role="group"
      aria-label={t("entryCreate.typeStep.title")}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {catalog.types.map((type) => (
        <EntryTypeTile key={type.key} type={type} onSelect={props.onSelect} />
      ))}
      <NewTypeTile onSelect={props.onCreateType} />
    </div>
  );
}
