import { useEffect, useState } from "react";

import { detachPromise } from "@renderer/lib/detach-promise";

import { useWindowControlsBridge } from "./use-window-controls-bridge";

/**
 * 跟踪窗口当前是否最大化: 挂载时向主进程读取初始状态, 之后订阅主进程推送的变化, 卸载时取消订阅.
 * 读取初始状态期间推送过来的状态更新, 不会被稍后到达的初始状态覆盖.
 * @returns 窗口已最大化时为 true.
 */
export function useWindowMaximized(): boolean {
  const bridge = useWindowControlsBridge();
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    let hasReceivedPush = false;
    const unsubscribe = bridge.onMaximizedChange((nextIsMaximized) => {
      hasReceivedPush = true;
      setIsMaximized(nextIsMaximized);
    });
    const syncInitialState = async (): Promise<void> => {
      const initialIsMaximized = await bridge.isMaximized();
      if (!hasReceivedPush) {
        setIsMaximized(initialIsMaximized);
      }
    };
    detachPromise(syncInitialState());
    return unsubscribe;
  }, [bridge]);
  return isMaximized;
}
