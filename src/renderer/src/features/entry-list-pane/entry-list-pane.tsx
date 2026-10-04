import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PaneHeading } from "@renderer/components/pane-heading";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useVisibleEntries } from "@renderer/stores/use-visible-entries";

import { EntryListBody } from "./entry-list-body";

/**
 * 条目列表窗格的属性.
 */
interface EntryListPaneProps {
  /**
   * 标题行最右侧的操作, 例如新建按钮. 由 app 层传入, feature 之间不互相引用.
   */
  readonly headerAction?: ReactNode;
  /**
   * 标题行下方, 列表上方的选择栏, 例如全选框与批量操作. 由 app 层传入, feature 之间不互相引用.
   */
  readonly selectionBar?: ReactNode;
}

/**
 * 中间的条目列表窗格: 标题行显示当前列出的条目数量与操作, 其下是由 app 层传入的选择栏, 再下方是
 * 按搜索关键字过滤后的条目, 点击一项选中它.
 * @param props 组件属性.
 * @returns 条目列表窗格元素.
 */
export function EntryListPane(props: EntryListPaneProps): React.JSX.Element {
  const { t } = useTranslation();
  const entries = useVisibleEntries();
  return (
    <section
      aria-label={t("entryListPane.heading")}
      className="flex h-full w-(--list-pane-width) shrink-0 flex-col border-e border-border"
    >
      <PaneHeading
        title={t("entryListPane.heading")}
        trailing={t("entryListPane.count", { count: entries.length })}
        action={props.headerAction}
      />
      {props.selectionBar}
      <ScrollArea className="min-h-0 flex-1">
        <EntryListBody entries={entries} />
      </ScrollArea>
    </section>
  );
}
