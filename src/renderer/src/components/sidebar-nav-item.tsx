import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import type { CollapseState } from "@renderer/components/ui/collapse-motion";
import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";
import { cn } from "@renderer/lib/class-names";
import { useDropTarget } from "@renderer/lib/drag-drop/use-drop-target";

import { SidebarNavItemActions } from "./sidebar-nav-item-actions";
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
   * 行尾的操作, 例如更多菜单. 侧栏折叠时淡出收起, 不可聚焦与点击.
   */
  readonly actions?: ReactNode;
}

/**
 * 两种状态下行尾的内边距: 折叠态没有行尾操作, 只留一点内边距抵消起始侧 2px 的选中竖条, 让图标居中.
 */
const ROW_END_PADDING: Readonly<Record<CollapseState, string>> = {
  expanded: "pe-1",
  collapsed: "pe-0.5",
};

/**
 * 按钮内容的排布: 图标与文字这一组始终在行内水平居中, 图标与文字的间距由文字容器自己的外边距
 * 过渡, 所以按钮本身不留间距. 展开时文字容器占满剩余宽度, 看上去靠起始侧排列; 折叠时只剩居中的图标.
 */
const BUTTON_LAYOUT_CLASSES = "justify-center gap-0 px-3";

/**
 * 拼出一行容器的类名: 快档状态过渡, 起始侧选中竖条的占位, 行尾内边距, 选中与放置高亮.
 * @param state 侧栏的折叠状态.
 * @param isSelected 这一行是否被选中.
 * @param isOver 拖拽源是否悬在这一行上.
 * @returns 行容器的类名.
 */
function buildRowClassName(
  state: CollapseState,
  isSelected: boolean,
  isOver: boolean,
): string {
  return cn(
    FAST_STATE_TRANSITION,
    "flex items-center border-s-2 border-s-transparent",
    ROW_END_PADDING[state],
    isSelected && "border-s-brand bg-muted",
    isOver && "bg-accent ring-1 ring-brand ring-inset",
  );
}

/**
 * 侧栏的一行入口: 图标, 名称与条目数, 行尾可放操作. 选中项除底色外, 起始侧还有强调色竖条, 并
 * 按 `selectionKind` 标记为当前项或已按下; 可接收拖放的行在拖拽源悬停时加底色与描边. 侧栏折叠时
 * 同一结构只显示居中的图标: 图标与文字在同一个按钮里, 文字容器收窄并淡出但仍是按钮的无障碍名称,
 * 行尾操作淡出并不可聚焦与点击, 悬停或聚焦时在右侧提示 "名称 (条目数)"; 选中状态与放置目标不变.
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
  const state: CollapseState = isCollapsed ? "collapsed" : "expanded";
  return (
    <li
      ref={setNodeRef}
      className={buildRowClassName(state, props.isSelected, isOver)}
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
                BUTTON_LAYOUT_CLASSES,
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
      {props.actions !== undefined && (
        <SidebarNavItemActions isCollapsed={isCollapsed}>
          {props.actions}
        </SidebarNavItemActions>
      )}
    </li>
  );
}
