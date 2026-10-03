import { FolderIcon, InboxIcon, ListIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { FolderSummary } from "@shared/folders/folder-types";
import {
  ALL_ENTRIES_VIEW,
  UNCATEGORIZED_VIEW,
  countEntriesInView,
  folderViewOf,
  isSameView,
} from "@shared/folders/folder-view";
import { UNCATEGORIZED_KEY } from "@shared/folders/uncategorized-key";

import { EmptyState } from "@renderer/components/empty-state";
import { SidebarNavItem } from "@renderer/components/sidebar-nav-item";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";
import { useSortedFolders } from "@renderer/stores/use-sorted-folders";

/**
 * 文件夹列表的属性.
 */
interface FolderListProps {
  /**
   * 生成某个文件夹行尾的操作, 例如更多菜单. 由 app 层传入, feature 之间不互相引用.
   */
  readonly renderActions?: (folder: FolderSummary) => ReactNode;
}

/**
 * 侧栏的文件夹列表: 固定的 "全部条目" 与 "未分类" 两个入口在前, 其后是自建的文件夹 (按名称排序规则排列), 每行显示条目数,
 * 点一行就让中间列表只显示它里面的条目. "未分类" 与文件夹行可以接收拖来的条目. 读取失败或没有
 * 自建文件夹时在列表下方说明.
 * @param props 组件属性.
 * @returns 文件夹列表元素.
 */
export function FolderList(props: FolderListProps): React.JSX.Element {
  const { t } = useTranslation();
  const folders = useSortedFolders();
  const loadStatus = useFolderStore((state) => state.loadStatus);
  const entries = useEntryStore((state) => state.entries);
  const view = useEntryStore((state) => state.view);
  const selectView = useEntryStore((state) => state.selectView);
  return (
    <>
      <ul>
        <SidebarNavItem
          label={t("folderPane.allEntries")}
          icon={<ListIcon aria-hidden="true" />}
          count={entries.length}
          isSelected={isSameView(view, ALL_ENTRIES_VIEW)}
          onSelect={() => selectView(ALL_ENTRIES_VIEW)}
        />
        <SidebarNavItem
          label={t("folderPane.uncategorized")}
          icon={<InboxIcon aria-hidden="true" />}
          count={countEntriesInView(entries, UNCATEGORIZED_VIEW)}
          isSelected={isSameView(view, UNCATEGORIZED_VIEW)}
          onSelect={() => selectView(UNCATEGORIZED_VIEW)}
          dropTargetId={UNCATEGORIZED_KEY}
        />
        {folders.map((folder) => (
          <SidebarNavItem
            key={folder.id}
            label={folder.name}
            icon={<FolderIcon aria-hidden="true" />}
            count={countEntriesInView(entries, folderViewOf(folder.id))}
            isSelected={isSameView(view, folderViewOf(folder.id))}
            onSelect={() => selectView(folderViewOf(folder.id))}
            dropTargetId={folder.id}
            actions={props.renderActions?.(folder)}
          />
        ))}
      </ul>
      {loadStatus === "failed" && (
        <EmptyState message={t("folderPane.loadFailed")} />
      )}
      {loadStatus === "ready" && folders.length === 0 && (
        <EmptyState message={t("folderPane.emptyFolders")} />
      )}
    </>
  );
}
