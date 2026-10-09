import type { ReactNode } from "react";

import { COLLAPSE_SPACE_TRANSITION } from "@renderer/components/ui/collapse-motion";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import { cn } from "@renderer/lib/class-names";

/**
 * 侧栏一行图标格的属性.
 */
interface SidebarNavItemIconProps {
  /**
   * 名称前的图标或颜色点.
   */
  readonly icon: ReactNode;
  /**
   * 侧栏是否折叠.
   */
  readonly isCollapsed: boolean;
}

/**
 * 图标格的共同类名: 与图标同宽的方格, 图标在里面居中, 颜色点与图标因此在同一列; 起始侧外边距带
 * 空间过渡.
 */
const ICON_CELL_BASE_CLASSES = `${COLLAPSE_SPACE_TRANSITION} inline-flex size-4 shrink-0 items-center justify-center`;

/**
 * 图标格在两种状态下的起始侧外边距: 展开时是行的内边距, 折叠时取折叠态居中所需的偏移 (组件 token).
 * 图标只在这两个终态之间滑动, 不随侧栏宽度摆动.
 */
const ICON_CELL_STATE_CLASSES: Readonly<Record<CollapseState, string>> = {
  expanded: "ms-3",
  collapsed: "ms-(--sidebar-row-icon-inset)",
};

/**
 * 侧栏一行里名称前的图标格: 按钮内容靠起始侧排列, 展开时图标靠起始侧, 折叠时图标居中, 起始侧外边距
 * 在两个终态之间过渡, 图标沿一条直线滑到位.
 * @param props 组件属性.
 * @returns 图标格元素.
 */
export function SidebarNavItemIcon(
  props: SidebarNavItemIconProps,
): React.JSX.Element {
  const state: CollapseState = props.isCollapsed ? "collapsed" : "expanded";
  return (
    <span
      className={cn(ICON_CELL_BASE_CLASSES, ICON_CELL_STATE_CLASSES[state])}
    >
      {props.icon}
    </span>
  );
}
