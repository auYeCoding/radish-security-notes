import { useTranslation } from "react-i18next";

import { findEntryType } from "@shared/entries/preset-entry-types";
import type { ImportTypeCount } from "@shared/import/import-types";

import { entryTypeName } from "@renderer/components/entry-type-naming";
import { Badge } from "@renderer/components/ui/badge";

/**
 * 类型分布的属性.
 */
interface ImportTypeCountsProps {
  /**
   * 每种类型的条目个数.
   */
  readonly typeCounts: readonly ImportTypeCount[];
}

/**
 * 条目类型分布: 一行徽章, 每个徽章是类型名与个数. 类型都是预设类型, 名称随界面语言.
 * @param props 组件属性.
 * @returns 类型分布元素.
 */
export function ImportTypeCounts(
  props: ImportTypeCountsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("import.preview.typesHeading")}</p>
      <ul className="flex flex-wrap gap-2">
        {props.typeCounts.map((typeCount) => {
          const type = findEntryType(typeCount.typeKey);
          const name =
            type === undefined ? typeCount.typeKey : entryTypeName(type, t);
          return (
            <li key={typeCount.typeKey}>
              <Badge variant="secondary">{`${name} ${typeCount.count}`}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
