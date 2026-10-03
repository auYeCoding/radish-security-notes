import { useTranslation } from "react-i18next";

import type { EntrySummary } from "@shared/entries/entry-types";

import { EmptyState } from "@renderer/components/empty-state";
import { selectedIdOf } from "@renderer/stores/entry-state";
import { useEntryStore } from "@renderer/stores/use-entry-store";

import { EntryListItem } from "./entry-list-item";

/**
 * 列表主体的属性.
 */
interface EntryListBodyProps {
  /**
   * 搜索过滤后要展示的条目.
   */
  readonly entries: readonly EntrySummary[];
}

/**
 * 选出列表为空时的说明文案键: 一个条目都没有时是 "还没有条目"; 有搜索关键字时是 "没有匹配的条目";
 * 否则是当前入口 (某个文件夹或未分类) 里没有条目.
 * @param hasAnyEntry 全部条目里是否至少有一个条目.
 * @param hasQuery 搜索框里是否有关键字.
 * @returns 文案键.
 */
function emptyMessageKey(
  hasAnyEntry: boolean,
  hasQuery: boolean,
):
  | "entryListPane.empty"
  | "entryListPane.noMatches"
  | "entryListPane.emptyView" {
  if (!hasAnyEntry) {
    return "entryListPane.empty";
  }
  return hasQuery ? "entryListPane.noMatches" : "entryListPane.emptyView";
}

/**
 * 列表主体: 读取失败时说明原因, 读取中不显示内容, 没有条目, 没有匹配或当前入口里没有条目时显示空状态,
 * 否则逐项列出条目并标出选中项.
 * @param props 组件属性.
 * @returns 列表主体元素, 读取中时为 null.
 */
export function EntryListBody(
  props: EntryListBodyProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const loadStatus = useEntryStore((state) => state.loadStatus);
  const hasAnyEntry = useEntryStore((state) => state.entries.length > 0);
  const selectedId = useEntryStore((state) => selectedIdOf(state.selection));
  const select = useEntryStore((state) => state.select);
  const hasQuery = useEntryStore((state) => state.query.trim() !== "");
  if (loadStatus === "failed") {
    return <EmptyState message={t("entryListPane.loadFailed")} />;
  }
  if (loadStatus === "loading") {
    return null;
  }
  if (props.entries.length === 0) {
    return <EmptyState message={t(emptyMessageKey(hasAnyEntry, hasQuery))} />;
  }
  return (
    <ul>
      {props.entries.map((entry) => (
        <EntryListItem
          key={entry.id}
          entry={entry}
          isSelected={entry.id === selectedId}
          onSelect={(id) => void select(id)}
        />
      ))}
    </ul>
  );
}
