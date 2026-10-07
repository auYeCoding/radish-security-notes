import { createContext } from "react";

import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

/**
 * 窗口控制桥的 React 上下文, 没有 Provider 时取值为 undefined. 窗口控制不放进全局状态, 组件按需经桥
 * 请主进程操作窗口.
 */
export const WindowControlsBridgeContext = createContext<
  WindowControlsBridge | undefined
>(undefined);
