import { useContext } from "react";

import { SidebarCollapseContext } from "./sidebar-collapse-context";

/**
 * 读取侧栏当前是否折叠.
 * @returns 折叠时为 true, 展开或不在侧栏装配之内时为 false.
 */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapseContext);
}
