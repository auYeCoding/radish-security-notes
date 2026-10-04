import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { EntryTypeIcon } from "@renderer/components/entry-type-icon";
import { entryTypeName } from "@renderer/components/entry-type-naming";

/**
 * 条目类型标识的属性.
 */
interface EntryTypeLabelProps {
  /**
   * 条目的类型定义.
   */
  readonly type: EntryTypeDefinition;
}

/**
 * 条目表单里标明所选类型的一行: 类型图标加类型名.
 * @param props 组件属性.
 * @returns 类型标识元素.
 */
export function EntryTypeLabel(props: EntryTypeLabelProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <EntryTypeIcon typeKey={props.type.key} className="size-4" />
      {entryTypeName(props.type, t)}
    </p>
  );
}
