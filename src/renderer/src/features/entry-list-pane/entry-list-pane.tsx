import { useTranslation } from "react-i18next";

import { EmptyState } from "@renderer/components/empty-state";
import { PaneHeading } from "@renderer/components/pane-heading";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

/**
 * 当前列表里的条目数量. 条目功能接入前恒为 0.
 */
const EMPTY_ENTRY_COUNT = 0;

/**
 * 中间的条目列表窗格. 现在只有标题, 数量与空状态说明, 没有数据.
 * @returns 条目列表窗格元素.
 */
export function EntryListPane(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section
      aria-label={t("entryListPane.heading")}
      className="flex h-full w-(--list-pane-width) shrink-0 flex-col border-e border-border"
    >
      <PaneHeading
        title={t("entryListPane.heading")}
        trailing={t("entryListPane.count", { count: EMPTY_ENTRY_COUNT })}
      />
      <ScrollArea className="min-h-0 flex-1">
        <EmptyState message={t("entryListPane.empty")} />
      </ScrollArea>
    </section>
  );
}
