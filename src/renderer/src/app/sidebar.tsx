import { SidebarCollapseContext } from "@renderer/components/sidebar-collapse-context";
import {
  COLLAPSE_EXTENT_TRANSITION,
  TOGGLE_ROW_ALIGNMENT_CLASSES,
  TOGGLE_ROW_SPACER_CLASSES,
} from "@renderer/components/ui/collapse-motion";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
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
 * 顶部入口行的共同类名: 切换按钮由前后两个占位夹在中间, 展开时后占位份额为零, 按钮靠结束侧,
 * 折叠时两个占位份额相等, 按钮居中; 份额过渡让按钮随宽度平滑滑动.
 */
const TOGGLE_ROW_CLASSES = `flex h-(--control-height) shrink-0 items-center px-3 ${TOGGLE_ROW_SPACER_CLASSES}`;

/**
 * 左侧栏的装配: 顶部一行折叠与展开的切换按钮, 其下是标签与文件夹窗格 (标签分区标题行放新建按钮,
 * 每个标签行与文件夹行尾放更多菜单), 底部是设置按钮. 从偏好 store 读取折叠状态: 展开时用展开宽度,
 * 折叠时用折叠宽度, 两个宽度之间按尺寸过渡变化, 过渡期间裁掉溢出的内容; 并经上下文告诉里面的行,
 * 分区标题与设置按钮改成只剩图标的样式. 只负责装配, 不含业务逻辑.
 * @returns 侧栏元素.
 */
export function Sidebar(): React.JSX.Element {
  const isCollapsed = usePreferencesStore((state) => state.isSidebarCollapsed);
  const collapseState: CollapseState = isCollapsed ? "collapsed" : "expanded";
  return (
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <aside
        data-state={collapseState}
        className={cn(
          COLLAPSE_EXTENT_TRANSITION,
          "flex shrink-0 flex-col overflow-hidden border-e border-sidebar-border bg-sidebar text-sidebar-foreground",
          isCollapsed ? COLLAPSED_WIDTH_CLASSES : EXPANDED_WIDTH_CLASSES,
        )}
      >
        <div
          className={cn(
            TOGGLE_ROW_CLASSES,
            TOGGLE_ROW_ALIGNMENT_CLASSES[collapseState],
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
