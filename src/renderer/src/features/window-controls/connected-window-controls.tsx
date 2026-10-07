import { WindowControls } from "@renderer/components/window-controls";
import { useWindowControlsBridge } from "@renderer/stores/use-window-controls-bridge";
import { useWindowMaximized } from "@renderer/stores/use-window-maximized";

/**
 * 接上窗口控制桥的窗口按钮组: 按钮点击经桥请主进程最小化, 最大化或还原, 关闭主窗口, 第二个按钮
 * 随主进程推送的最大化状态显示最大化或还原.
 * @returns 窗口按钮组元素.
 */
export function ConnectedWindowControls(): React.JSX.Element {
  const bridge = useWindowControlsBridge();
  const isMaximized = useWindowMaximized();
  return (
    <WindowControls
      isMaximized={isMaximized}
      onMinimize={() => void bridge.minimize()}
      onToggleMaximize={() => void bridge.toggleMaximize()}
      onClose={() => void bridge.close()}
    />
  );
}
