import { TooltipProvider } from "@renderer/components/ui/tooltip";

import { VaultGate } from "./vault-gate";
import { WindowFrame } from "./window-frame";

/**
 * 渲染进程的根组件: 为全部悬停提示提供上下文, 在窗口框架里 (顶部是标题栏) 经保险库门控渲染引导页,
 * 解锁页或三栏主界面.
 * @returns 应用的根节点.
 */
export function App(): React.JSX.Element {
  return (
    <TooltipProvider>
      <WindowFrame>
        <VaultGate />
      </WindowFrame>
    </TooltipProvider>
  );
}
