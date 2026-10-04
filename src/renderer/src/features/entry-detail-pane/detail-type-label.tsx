import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { EntryTypeIcon } from "@renderer/components/entry-type-icon";
import { entryTypeName } from "@renderer/components/entry-type-naming";

/**
 * 详情类型标识的属性.
 */
interface DetailTypeLabelProps {
  /**
   * 条目的类型定义.
   */
  readonly type: EntryTypeDefinition;
}

/**
 * 详情标题上方标明条目类型的一行辅助文字: 类型图标加类型名.
 * @param props 组件属性.
 * @returns 类型标识元素.
 */
export function DetailTypeLabel(
  props: DetailTypeLabelProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <EntryTypeIcon typeKey={props.type.key} className="size-3.5" />
      {entryTypeName(props.type, t)}
    </p>
  );
}
