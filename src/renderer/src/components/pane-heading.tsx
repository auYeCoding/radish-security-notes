import type { ReactNode } from "react";

import { CollapsibleBox } from "@renderer/components/collapsible-box";
import {
  COLLAPSE_LAYER_CELL_CLASSES,
  COLLAPSE_LAYER_STACK_CLASSES,
} from "@renderer/components/ui/collapse-motion";
import { Separator } from "@renderer/components/ui/separator";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";

/**
 * 窗格标题的属性.
 */
interface PaneHeadingProps {
  /**
   * 标题文字.
   */
  readonly title: string;
  /**
   * 标题右侧的辅助内容, 例如条目计数.
   */
  readonly trailing?: ReactNode;
  /**
   * 标题行最右侧的操作, 例如新建按钮.
   */
  readonly action?: ReactNode;
}

/**
 * 标题块内层的排布: 标题在左, 辅助内容与操作在右.
 */
const TITLE_CONTENT_CLASSES =
  "flex items-center justify-between px-4 pt-4 pb-2";

/**
 * 分隔线块内层的排布: 分隔线上下留出间距.
 */
const SEPARATOR_CONTENT_CLASSES = "px-3 py-2";

/**
 * 分隔线块所在的网格单元: 从单元顶部往下偏移一个固定距离开始, 不垂直居中. 偏移取自组件 token,
 * 让折叠态的第一条分隔线与右侧顶栏的下边线对齐.
 */
const SEPARATOR_CELL_CLASSES = `${COLLAPSE_LAYER_CELL_CLASSES} self-start mt-(--sidebar-separator-offset)`;

/**
 * 窗格或分区的标题行: 左侧是标题, 右侧可放辅助内容与操作. 标题块与分隔线块叠放在同一个单元里,
 * 折叠的侧栏里标题块淡出, 分隔线块淡入并从固定偏移处开始 (第一条分隔线与顶栏下边线对齐), 两者都
 * 不改变高度, 所以标题行在展开与折叠时占位一样高, 其下的分区位置不随折叠移动. 淡出的一块不可聚焦
 * 也不可点击, 读屏软件读不到.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function PaneHeading(props: PaneHeadingProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  return (
    <div className={COLLAPSE_LAYER_STACK_CLASSES}>
      <CollapsibleBox
        isExpanded={isCollapsed}
        axis="none"
        className={SEPARATOR_CELL_CLASSES}
        contentClassName={SEPARATOR_CONTENT_CLASSES}
      >
        <Separator />
      </CollapsibleBox>
      <CollapsibleBox
        isExpanded={!isCollapsed}
        axis="none"
        className={COLLAPSE_LAYER_CELL_CLASSES}
        contentClassName={TITLE_CONTENT_CLASSES}
      >
        <h2 className="text-sm font-semibold whitespace-nowrap">
          {props.title}
        </h2>
        <div className="flex items-center gap-2">
          {props.trailing === undefined ? null : (
            <span className="text-xs text-muted-foreground">
              {props.trailing}
            </span>
          )}
          {props.action}
        </div>
      </CollapsibleBox>
    </div>
  );
}
