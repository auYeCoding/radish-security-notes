import { useTranslation } from "react-i18next";

import { EmptyState } from "@renderer/components/empty-state";

/**
 * 列表空状态的属性.
 */
interface EntryListEmptyStateProps {
  /**
   * 全部条目里是否至少有一个条目.
   */
  readonly hasAnyEntry: boolean;
  /**
   * 搜索框里是否有关键字.
   */
  readonly hasQuery: boolean;
  /**
   * 左侧栏是否选了文件夹, 搜索只在筛选结果里进行.
   */
  readonly isFiltered: boolean;
}

/**
 * 选出列表为空时的说明文案键: 一个条目都没有时是 "还没有条目"; 有搜索关键字时是 "没有匹配的条目";
 * 否则是当前入口 (某个文件夹) 里没有条目.
 * @param props 空状态的条件.
 * @returns 文案键.
 */
function emptyMessageKey(
  props: EntryListEmptyStateProps,
):
  | "entryListPane.empty"
  | "entryListPane.noMatches"
  | "entryListPane.emptyView" {
  if (!props.hasAnyEntry) {
    return "entryListPane.empty";
  }
  return props.hasQuery ? "entryListPane.noMatches" : "entryListPane.emptyView";
}

/**
 * 列表为空时的说明: 没有条目, 没有匹配或当前入口里没有条目; 没有匹配且左侧栏选了文件夹时,
 * 补一句搜索只在当前筛选结果里进行, 避免用户以为条目不存在.
 * @param props 组件属性.
 * @returns 空状态元素.
 */
export function EntryListEmptyState(
  props: EntryListEmptyStateProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const isScopeHintShown =
    props.hasAnyEntry && props.hasQuery && props.isFiltered;
  return (
    <>
      <EmptyState message={t(emptyMessageKey(props))} />
      {isScopeHintShown ? (
        <EmptyState message={t("entryListPane.noMatchesInFilter")} />
      ) : null}
    </>
  );
}
