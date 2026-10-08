import { CollapsibleText } from "@renderer/components/collapsible-text";
import { COLLAPSIBLE_TEXT_STATE_CLASSES } from "@renderer/components/ui/collapse-motion";

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
 * 文字内层的排布: 名称与条目数横排, 名称占满剩余宽度.
 */
const CONTENT_CLASSES = "flex items-center gap-2";

/**
 * 侧栏一行里图标之后的文字容器: 名称在前, 条目数在后. 展开时占满剩余宽度, 折叠时份额归零并淡出,
 * 过渡结束后不占位也不可见, 文字仍留在所在按钮的无障碍名称里.
 * @param props 组件属性.
 * @returns 文字容器元素.
 */
export function SidebarNavItemText(
  props: SidebarNavItemTextProps,
): React.JSX.Element {
  return (
    <CollapsibleText
      slot="sidebar-nav-item-text"
      isCollapsed={props.isCollapsed}
      stateClasses={COLLAPSIBLE_TEXT_STATE_CLASSES}
      contentClassName={CONTENT_CLASSES}
    >
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
      <span className="text-xs font-normal text-muted-foreground">
        {props.count}
      </span>
    </CollapsibleText>
  );
}
