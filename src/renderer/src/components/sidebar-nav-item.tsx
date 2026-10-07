import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";
import { cn } from "@renderer/lib/class-names";
import { useDropTarget } from "@renderer/lib/drag-drop/use-drop-target";

import { SidebarNavItemText } from "./sidebar-nav-item-text";

/**
 * 不接收放置的行用的占位编号, 它的放置目标处于禁用状态, 不会被命中.
 */
const NO_DROP_TARGET_ID = "no-drop-target";

/**
 * 侧栏一行表达选中状态的方式: `current` 是单选列表里的当前项 (`aria-current`), 例如文件夹入口;
 * `toggle` 是可以多选的开关 (`aria-pressed`), 例如标签.
 */
export type SidebarSelectionKind = "current" | "toggle";

/**
 * 侧栏一行的属性.
 */
interface SidebarNavItemProps {
  /**
   * 行的名称.
   */
  readonly label: string;
  /**
   * 名称前的图标或颜色点.
   */
  readonly icon: ReactNode;
  /**
   * 这一行入口里的条目数.
   */
  readonly count: number;
  /**
   * 这一行当前是否被选中.
   */
  readonly isSelected: boolean;
  /**
   * 点击这一行时的回调.
   */
  readonly onSelect: () => void;
  /**
   * 选中状态的表达方式, 默认是 `current`.
   */
  readonly selectionKind?: SidebarSelectionKind;
  /**
   * 作为放置目标时的编号, 省略表示不接收拖放.
   */
  readonly dropTargetId?: string;
  /**
   * 行尾的操作, 例如更多菜单. 侧栏折叠时不显示.
   */
  readonly actions?: ReactNode;
}

/**
 * 侧栏一行的展开与折叠两种布局.
 */
type SidebarRowLayout = "expanded" | "collapsed";

/**
 * 两种布局下行尾的内边距: 折叠态没有行尾操作, 只留一点内边距抵消起始侧 2px 的选中竖条, 让图标居中.
 */
const ROW_END_PADDING: Readonly<Record<SidebarRowLayout, string>> = {
  expanded: "pe-1",
  collapsed: "pe-0.5",
};

/**
 * 两种布局下按钮内容的排布: 展开时靠起始侧排列, 折叠时图标在行内水平居中.
 */
const BUTTON_LAYOUT: Readonly<Record<SidebarRowLayout, string>> = {
  expanded: "justify-start gap-2 px-3",
  collapsed: "justify-center px-0",
};

/**
 * 侧栏的一行入口: 图标, 名称与条目数, 行尾可放操作. 选中项除底色外, 起始侧还有强调色竖条, 并
 * 按 `selectionKind` 标记为当前项或已按下; 可接收拖放的行在拖拽源悬停时加底色与描边. 侧栏折叠时
 * 同一结构只显示居中的图标: 图标与文字在同一个按钮里, 文字容器收起但仍是按钮的无障碍名称, 行尾操作
 * 不显示, 悬停或聚焦时在右侧提示 "名称 (条目数)"; 选中状态与放置目标不变.
 * @param props 组件属性.
 * @returns 侧栏行元素.
 */
export function SidebarNavItem(props: SidebarNavItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const isCollapsed = useSidebarCollapsed();
  const { setNodeRef, isOver } = useDropTarget(
    props.dropTargetId ?? NO_DROP_TARGET_ID,
    props.dropTargetId === undefined,
  );
  const isToggle = props.selectionKind === "toggle";
  const layout: SidebarRowLayout = isCollapsed ? "collapsed" : "expanded";
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center border-s-2 border-s-transparent",
        ROW_END_PADDING[layout],
        props.isSelected && "border-s-brand bg-muted",
        isOver && "bg-accent ring-1 ring-brand ring-inset",
      )}
    >
      <Tooltip disabled={!isCollapsed}>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              aria-current={!isToggle && props.isSelected ? "true" : undefined}
              aria-pressed={isToggle ? props.isSelected : undefined}
              onClick={props.onSelect}
              className={cn(
                "h-(--control-height) min-w-0 flex-1 rounded-none text-start",
                BUTTON_LAYOUT[layout],
              )}
            />
          }
        >
          {props.icon}
          <SidebarNavItemText
            label={props.label}
            count={props.count}
            isCollapsed={isCollapsed}
          />
        </TooltipTrigger>
        <TooltipContent side="right">
          {t("sidebar.rowTooltip", { name: props.label, count: props.count })}
        </TooltipContent>
      </Tooltip>
      {!isCollapsed && props.actions}
    </li>
  );
}
