import { SidebarCollapseContext } from "@renderer/components/sidebar-collapse-context";
import { FolderPane } from "@renderer/features/folder-pane/folder-pane";
import { NewFolderTrigger } from "@renderer/features/folder-create/new-folder-trigger";
import { SidebarToggle } from "@renderer/features/sidebar-toggle/sidebar-toggle";
import { NewTagTrigger } from "@renderer/features/tag-create/new-tag-trigger";
import { cn } from "@renderer/lib/class-names";
import { usePreferencesStore } from "@renderer/stores/use-preferences-store";

import { FolderRowActions } from "./folder-row-actions";
import { SettingsEntry } from "./settings-entry";
import { TagRowActions } from "./tag-row-actions";

/**
 * 侧栏展开时的宽度类名, 取自展开宽度 token.
 */
const EXPANDED_WIDTH_CLASSES = "w-(--sidebar-width)";

/**
 * 侧栏折叠时的宽度类名, 取自折叠宽度 token, 刚好放下居中的图标按钮.
 */
const COLLAPSED_WIDTH_CLASSES = "w-(--sidebar-collapsed-width)";

/**
 * 顶部入口行展开时的对齐类名: 切换按钮靠结束侧.
 */
const EXPANDED_TOGGLE_ROW_CLASSES = "justify-end";

/**
 * 顶部入口行折叠时的对齐类名: 切换按钮居中.
 */
const COLLAPSED_TOGGLE_ROW_CLASSES = "justify-center";

/**
 * 左侧栏的装配: 顶部一行折叠与展开的切换按钮, 其下是标签与文件夹窗格 (标签分区标题行放新建按钮,
 * 每个标签行与文件夹行尾放更多菜单), 底部是设置按钮. 从偏好 store 读取折叠状态: 展开时用展开宽度,
 * 折叠时用折叠宽度, 并经上下文告诉里面的行, 分区标题与设置按钮改成只剩图标的样式. 只负责装配,
 * 不含业务逻辑.
 * @returns 侧栏元素.
 */
export function Sidebar(): React.JSX.Element {
  const isCollapsed = usePreferencesStore((state) => state.isSidebarCollapsed);
  return (
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <aside
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "flex shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground",
          isCollapsed ? COLLAPSED_WIDTH_CLASSES : EXPANDED_WIDTH_CLASSES,
        )}
      >
        <div
          className={cn(
            "flex h-(--control-height) shrink-0 items-center px-3",
            isCollapsed
              ? COLLAPSED_TOGGLE_ROW_CLASSES
              : EXPANDED_TOGGLE_ROW_CLASSES,
          )}
        >
          <SidebarToggle />
        </div>
        <FolderPane
          tagHeaderAction={<NewTagTrigger />}
          renderTagActions={(tag) => <TagRowActions tag={tag} />}
          folderHeaderAction={<NewFolderTrigger />}
          renderFolderActions={(folder) => <FolderRowActions folder={folder} />}
        />
        <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
          <SettingsEntry />
        </div>
      </aside>
    </SidebarCollapseContext.Provider>
  );
}
