import { useTranslation } from "react-i18next";

import {
  PRESET_ENTRY_TYPES,
  type PresetEntryTypeDefinition,
} from "@shared/entries/preset-entry-types";

import { EntryTypeTile } from "./entry-type-tile";

/**
 * 类型网格的属性.
 */
interface EntryTypeGridProps {
  /**
   * 选中一个类型时的回调, 参数是被选中的类型.
   */
  readonly onSelect: (type: PresetEntryTypeDefinition) => void;
}

/**
 * 新建条目第一步的类型选择网格: 全部预设类型按预设顺序排成格子, 窄时两列, 宽时三列.
 * @param props 组件属性.
 * @returns 类型网格元素.
 */
export function EntryTypeGrid(props: EntryTypeGridProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("entryCreate.typeStep.title")}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {PRESET_ENTRY_TYPES.map((type) => (
        <EntryTypeTile key={type.key} type={type} onSelect={props.onSelect} />
      ))}
    </div>
  );
}
