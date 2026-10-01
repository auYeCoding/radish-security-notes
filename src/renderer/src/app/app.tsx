import { TooltipProvider } from "@renderer/components/ui/tooltip";

import { AppShell } from "./app-shell";

/**
 * 渲染进程的根组件: 为全部悬停提示提供上下文, 再渲染三栏主界面.
 * @returns 应用的根节点.
 */
export function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <AppShell />
    </TooltipProvider>
  );
}
