import { useSidebarCollapsed } from "@renderer/components/use-sidebar-collapsed";
import { cn } from "@renderer/lib/class-names";

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
 * 空状态说明: 区域里没有内容时显示的一行辅助文字. 在折叠的侧栏里放不下文字, 只对读屏软件保留.
 * @param props 组件属性.
 * @returns 空状态元素.
 */
export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  const isCollapsed = useSidebarCollapsed();
  return (
    <p
      className={cn(
        isCollapsed ? "sr-only" : "px-4 py-2 text-sm text-muted-foreground",
      )}
    >
      {props.message}
    </p>
  );
}
