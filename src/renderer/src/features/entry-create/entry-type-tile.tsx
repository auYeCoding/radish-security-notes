import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { EntryTypeIcon } from "@renderer/components/entry-type-icon";
import { entryTypeName } from "@renderer/components/entry-type-naming";
import { Button } from "@renderer/components/ui/button";

/**
 * 类型格的属性.
 */
interface EntryTypeTileProps {
  /**
   * 这个格子代表的条目类型.
   */
  readonly type: EntryTypeDefinition;
  /**
   * 点击格子时的回调, 参数是被选中的类型.
   */
  readonly onSelect: (type: EntryTypeDefinition) => void;
}

/**
 * 类型选择网格里的一格: 图标在上, 类型名在下, 点击即选中这个类型. 预设类型与自定义类型共用.
 * @param props 组件属性.
 * @returns 类型格元素.
 */
export function EntryTypeTile(props: EntryTypeTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const { type } = props;
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto flex-col gap-2 px-2 py-4"
      onClick={() => props.onSelect(type)}
    >
      <EntryTypeIcon typeKey={type.key} className="size-6" />
      <span className="text-center text-sm break-words whitespace-normal">
        {entryTypeName(type, t)}
      </span>
    </Button>
  );
}
