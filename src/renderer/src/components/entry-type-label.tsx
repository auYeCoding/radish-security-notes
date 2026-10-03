import { useTranslation } from "react-i18next";

import type { EntryTypeKey } from "@shared/entries/preset-entry-types";

import { EntryTypeIcon } from "@renderer/components/entry-type-icon";

/**
 * 条目类型标识的属性.
 */
interface EntryTypeLabelProps {
  /**
   * 条目的类型键.
   */
  readonly typeKey: EntryTypeKey;
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
      <EntryTypeIcon typeKey={props.typeKey} className="size-4" />
      {t(`entryTypes.${props.typeKey}`)}
    </p>
  );
}
