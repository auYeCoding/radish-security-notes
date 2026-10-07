/**
 * 侧栏一行文字的属性.
 */
interface SidebarNavItemTextProps {
  /**
   * 行的名称.
   */
  readonly label: string;
  /**
   * 这一行入口里的条目数.
   */
  readonly count: number;
  /**
   * 侧栏是否折叠.
   */
  readonly isCollapsed: boolean;
}

/**
 * 展开态文字容器的类名: 名称与条目数横排, 名称占满剩余宽度.
 */
const EXPANDED_CLASSES = "flex min-w-0 flex-1 items-center gap-2";

/**
 * 折叠态文字容器的类名: 视觉上收起, 不占位, 文字仍留在所在按钮的无障碍名称里.
 */
const COLLAPSED_CLASSES = "sr-only";

/**
 * 侧栏一行里图标之后的文字容器: 名称在前, 条目数在后. 展开时横排显示, 折叠时整个容器收起, 之后的渐隐等
 * 动效直接作用在这个容器上.
 * @param props 组件属性.
 * @returns 文字容器元素.
 */
export function SidebarNavItemText(
  props: SidebarNavItemTextProps,
): React.JSX.Element {
  return (
    <span
      data-slot="sidebar-nav-item-text"
      className={props.isCollapsed ? COLLAPSED_CLASSES : EXPANDED_CLASSES}
    >
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
      <span className="text-xs font-normal text-muted-foreground">
        {props.count}
      </span>
    </span>
  );
}
