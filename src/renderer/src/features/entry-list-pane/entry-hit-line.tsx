import { useTranslation } from "react-i18next";

import {
  SEARCH_CUSTOM_FIELD_LABEL_FIELD,
  SEARCH_NAME_FIELD,
  SEARCH_NOTES_FIELD,
  SEARCH_TAG_FIELD,
  type EntrySearchField,
} from "@shared/search/search-fields";

/**
 * 命中字段名之间的分隔符.
 */
const FIELD_SEPARATOR = ", ";

/**
 * 命中字段行的属性.
 */
interface EntryHitLineProps {
  /**
   * 条目命中的全部字段.
   */
  readonly fields: readonly EntrySearchField[];
}

/**
 * 列表项里的命中字段行: "命中: 备注, 网址", 只列出名称与账号之外的命中字段, 只写字段名不写内容.
 * 名称与账号的命中已经在前两行用高亮标出. 没有要列出的字段时不渲染.
 * @param props 组件属性.
 * @returns 命中字段行元素, 没有要列出的字段时为 null.
 */
export function EntryHitLine(
  props: EntryHitLineProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const labelOf = (field: EntrySearchField): string | undefined => {
    switch (field) {
      case SEARCH_NAME_FIELD:
      case "account":
        return undefined;
      case SEARCH_NOTES_FIELD:
        return t("entryListPane.hit.notes");
      case SEARCH_CUSTOM_FIELD_LABEL_FIELD:
        return t("entryListPane.hit.customFieldLabel");
      case SEARCH_TAG_FIELD:
        return t("entryListPane.hit.tag");
      default:
        return t(`entryFields.${field}`);
    }
  };
  const labels = props.fields
    .map(labelOf)
    .filter((label): label is string => label !== undefined);
  if (labels.length === 0) {
    return null;
  }
  return (
    <span className="w-full truncate text-xs font-normal text-muted-foreground">
      {t("entryListPane.matchedFields", {
        fields: labels.join(FIELD_SEPARATOR),
      })}
    </span>
  );
}
