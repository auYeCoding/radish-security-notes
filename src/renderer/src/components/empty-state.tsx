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
 * 空状态说明: 区域里没有内容时显示的一行辅助文字. 在折叠的侧栏里放不下文字, 沿高度收起并淡出,
 * 收起后仍留在无障碍树里, 读屏软件能读到.
 * @param props 组件属性.
 * @returns 空状态元素.
 */
export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  return (
    <CollapsibleBox
      isExpanded={!isCollapsed}
      axis="height"
      isHiddenWhenCollapsed={false}
    >
      <p className="px-4 py-2 text-sm text-muted-foreground">{props.message}</p>
    </CollapsibleBox>
  );
}
