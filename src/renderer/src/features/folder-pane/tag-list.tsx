import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { countEntriesWithTag } from "@shared/tags/tag-filter";
import type { TagSummary } from "@shared/tags/tag-types";

import { EmptyState } from "@renderer/components/empty-state";
import { SidebarNavItem } from "@renderer/components/sidebar-nav-item";
import { TagColorDot } from "@renderer/components/tag-color-dot";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useSortedTags } from "@renderer/stores/use-sorted-tags";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 标签列表的属性.
 */
interface TagListProps {
  /**
   * 生成某个标签行尾的操作, 例如更多菜单. 由 app 层传入, feature 之间不互相引用.
   */
  readonly renderActions?: (tag: TagSummary) => ReactNode;
}

/**
 * 侧栏的标签列表: 每个标签一行 (按名称排序规则排列), 显示颜色点, 名称与带这个标签的条目总数, 点一行切换它的选中状态,
 * 可以同时选中多个, 中间列表只显示带全部已选标签的条目. 读取失败或没有标签时在列表下方说明.
 * @param props 组件属性.
 * @returns 标签列表元素.
 */
export function TagList(props: TagListProps): React.JSX.Element {
  const { t } = useTranslation();
  const tags = useSortedTags();
  const loadStatus = useTagStore((state) => state.loadStatus);
  const entries = useEntryStore((state) => state.entries);
  const selectedTagIds = useEntryStore((state) => state.selectedTagIds);
  const toggleTag = useEntryStore((state) => state.toggleTag);
  return (
    <>
      <ul>
        {tags.map((tag) => (
          <SidebarNavItem
            key={tag.id}
            label={tag.name}
            icon={<TagColorDot color={tag.color} />}
            count={countEntriesWithTag(entries, tag.id)}
            isSelected={selectedTagIds.includes(tag.id)}
            selectionKind="toggle"
            onSelect={() => toggleTag(tag.id)}
            actions={props.renderActions?.(tag)}
          />
        ))}
      </ul>
      {loadStatus === "failed" && (
        <EmptyState message={t("folderPane.tagsLoadFailed")} />
      )}
      {loadStatus === "ready" && tags.length === 0 && (
        <EmptyState message={t("folderPane.emptyTags")} />
      )}
    </>
  );
}
