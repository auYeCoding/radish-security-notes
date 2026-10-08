import type { ReactNode } from "react";

import { CollapsibleBox } from "@renderer/components/collapsible-box";

/**
 * 侧栏一行行尾操作的属性.
 */
interface SidebarNavItemActionsProps {
  /**
   * 侧栏是否折叠.
   */
  readonly isCollapsed: boolean;
  /**
   * 行尾操作, 例如更多菜单.
   */
  readonly children: ReactNode;
}

/**
 * 行尾操作盒子内层的排布: 操作按钮横排并垂直居中.
 */
const ACTIONS_CONTENT_CLASSES = "flex items-center";

/**
 * 侧栏一行的行尾操作: 展开时沿宽度展开, 折叠时沿宽度收起并淡出, 收起后不可聚焦与点击. 操作始终挂载,
 * 所以展开与折叠之间有过渡而不是瞬间出现或消失.
 * @param props 组件属性.
 * @returns 行尾操作元素.
 */
export function SidebarNavItemActions(
  props: SidebarNavItemActionsProps,
): React.JSX.Element {
  return (
    <CollapsibleBox
      isExpanded={!props.isCollapsed}
      axis="width"
      contentClassName={ACTIONS_CONTENT_CLASSES}
    >
      {props.children}
    </CollapsibleBox>
  );
}
