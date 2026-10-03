import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import { cn } from "@renderer/lib/class-names";
import { useDropTarget } from "@renderer/lib/drag-drop/use-drop-target";

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
   * 行尾的操作, 例如更多菜单.
   */
  readonly actions?: ReactNode;
}

/**
 * 侧栏的一行入口: 图标, 名称与条目数, 行尾可放操作. 选中项除底色外, 起始侧还有强调色竖条, 并
 * 按 `selectionKind` 标记为当前项或已按下; 可接收拖放的行在拖拽源悬停时加底色与描边.
 * @param props 组件属性.
 * @returns 侧栏行元素.
 */
export function SidebarNavItem(props: SidebarNavItemProps): React.JSX.Element {
  const { setNodeRef, isOver } = useDropTarget(
    props.dropTargetId ?? NO_DROP_TARGET_ID,
    props.dropTargetId === undefined,
  );
  const isToggle = props.selectionKind === "toggle";
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center border-s-2 border-s-transparent pe-1",
        props.isSelected && "border-s-brand bg-muted",
        isOver && "bg-accent ring-1 ring-brand ring-inset",
      )}
    >
      <Button
        variant="ghost"
        aria-current={!isToggle && props.isSelected ? "true" : undefined}
        aria-pressed={isToggle ? props.isSelected : undefined}
        onClick={props.onSelect}
        className="h-(--control-height) min-w-0 flex-1 justify-start gap-2 rounded-none px-3 text-start"
      >
        {props.icon}
        <span className="min-w-0 flex-1 truncate">{props.label}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {props.count}
        </span>
      </Button>
      {props.actions}
    </li>
  );
}
