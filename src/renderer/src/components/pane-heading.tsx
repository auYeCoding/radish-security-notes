import type { ReactNode } from "react";

import { CollapsibleBox } from "@renderer/components/collapsible-box";
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
 * 窗格或分区的标题行: 左侧是标题, 右侧可放辅助内容与操作. 在折叠的侧栏里标题块沿高度收起并淡出,
 * 同时一条分隔线块沿高度放出并淡入, 两者交叉过渡, 终态只留分隔线隔开上下两个分区. 收起的一块
 * 不可聚焦也不可点击, 读屏软件读不到.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function PaneHeading(props: PaneHeadingProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  return (
    <>
      <CollapsibleBox
        isExpanded={!isCollapsed}
        axis="height"
        contentClassName={TITLE_CONTENT_CLASSES}
      >
        <h2 className="text-sm font-semibold">{props.title}</h2>
        <div className="flex items-center gap-2">
          {props.trailing === undefined ? null : (
            <span className="text-xs text-muted-foreground">
              {props.trailing}
            </span>
          )}
          {props.action}
        </div>
      </CollapsibleBox>
      <CollapsibleBox
        isExpanded={isCollapsed}
        axis="height"
        contentClassName={SEPARATOR_CONTENT_CLASSES}
      >
        <Separator />
      </CollapsibleBox>
    </>
  );
}
