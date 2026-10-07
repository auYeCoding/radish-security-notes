import { createContext } from "react";

/**
 * 侧栏是否折叠的 React 上下文. 侧栏装配处提供它, 侧栏里的行, 标题与设置按钮读取它来决定显示成只剩
 * 图标还是完整样式; 没有 Provider 时取值为 false, 即展开, 所以侧栏之外复用这些组件时不受影响.
 */
export const SidebarCollapseContext = createContext<boolean>(false);
