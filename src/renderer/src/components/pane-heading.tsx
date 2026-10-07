import type { ReactNode } from "react";

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
 * 窗格或分区的标题行: 左侧是标题, 右侧可放辅助内容与操作. 在折叠的侧栏里不显示标题文字, 辅助内容与
 * 操作, 只留一条分隔线隔开上下两个分区.
 * @param props 组件属性.
 * @returns 标题行元素.
 */
export function PaneHeading(props: PaneHeadingProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  if (isCollapsed) {
    return (
      <div className="px-3 py-2">
        <Separator />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h2 className="text-sm font-semibold">{props.title}</h2>
      <div className="flex items-center gap-2">
        {props.trailing === undefined ? null : (
          <span className="text-xs text-muted-foreground">
            {props.trailing}
          </span>
        )}
        {props.action}
      </div>
    </div>
  );
}
