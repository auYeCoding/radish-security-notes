import { CollapsibleBox } from "@renderer/components/collapsible-box";
import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";

/**
 * 空状态的属性.
 */
interface EmptyStateProps {
  /**
   * 空状态的说明文字.
   */
  readonly message: string;
}

/**
 * 说明文字的排版宽度: 始终取侧栏展开宽度, 折叠与过渡中文字也按这个宽度换行, 高度不变; 超出折叠
 * 宽度的部分被侧栏裁掉.
 */
const EXPANDED_LAYOUT_CLASSES = "w-(--sidebar-width)";

/**
 * 空状态说明: 区域里没有内容时显示的一行辅助文字. 在折叠的侧栏里放不下文字, 淡出但仍占着展开时的
 * 高度, 其下的分区位置不随折叠移动; 淡出后仍留在无障碍树里, 读屏软件能读到.
 * @param props 组件属性.
 * @returns 空状态元素.
 */
export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  return (
    <CollapsibleBox
      isExpanded={!isCollapsed}
      axis="none"
      isHiddenWhenCollapsed={false}
      contentClassName={EXPANDED_LAYOUT_CLASSES}
    >
      <p className="px-4 py-2 text-sm text-muted-foreground">{props.message}</p>
    </CollapsibleBox>
  );
}
