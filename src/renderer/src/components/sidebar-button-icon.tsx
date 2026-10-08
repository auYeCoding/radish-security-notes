import type { ReactNode } from "react";

import { StatusDot } from "@renderer/components/status-dot";
import {
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
  COLLAPSE_SPACE_TRANSITION,
} from "@renderer/components/ui/collapse-motion";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import { cn } from "@renderer/lib/class-names";

/**
 * 侧栏底部按钮图标格的属性.
 */
interface SidebarButtonIconProps {
  /**
   * 按钮的图标元素.
   */
  readonly icon: ReactNode;
  /**
   * 侧栏是否折叠.
   */
  readonly isCollapsed: boolean;
  /**
   * 按钮上是否有标记, 有标记时图标右上角挂一个状态圆点.
   */
  readonly hasBadge: boolean;
}

/**
 * 图标格在两种状态下的内边距: 展开时起始侧留 8px, 与文字隔开 6px; 折叠时都归零, 只剩居中的图标.
 */
const ICON_CELL_STATE_CLASSES: Readonly<Record<CollapseState, string>> = {
  expanded: "ps-2 pe-1.5",
  collapsed: "ps-0 pe-0",
};

/**
 * 状态圆点淡入淡出所用的状态: 与文字相反, 折叠时显示, 展开时隐藏.
 */
const DOT_FADE_STATE: Readonly<Record<CollapseState, CollapseState>> = {
  expanded: "collapsed",
  collapsed: "expanded",
};

/**
 * 侧栏底部按钮里的图标格: 图标加可选的状态圆点. 内边距随折叠状态过渡, 展开时图标靠起始侧,
 * 折叠时居中; 状态圆点始终挂载, 折叠时淡入, 展开时淡出. 设置按钮与锁定按钮共用.
 * @param props 组件属性.
 * @returns 图标格元素.
 */
export function SidebarButtonIcon(
  props: SidebarButtonIconProps,
): React.JSX.Element {
  const state: CollapseState = props.isCollapsed ? "collapsed" : "expanded";
  return (
    <span
      className={cn(
        COLLAPSE_SPACE_TRANSITION,
        "relative inline-flex",
        ICON_CELL_STATE_CLASSES[state],
      )}
    >
      {props.icon}
      {props.hasBadge && (
        <StatusDot
          className={cn(
            COLLAPSE_FADE_TRANSITION,
            COLLAPSE_FADE_CLASSES[DOT_FADE_STATE[state]],
            "absolute -end-1 -top-1",
          )}
        />
      )}
    </span>
  );
}
